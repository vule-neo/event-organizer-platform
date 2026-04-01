const pool = require('../config/db');
const mailer = require('../config/mailer');
const pricingService = require('./pricing.service');

// Helper za formatiranje datuma
const formatDateTime = (dt) => {
    const d = new Date(dt);
    return d.toLocaleString('sr-RS', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

exports.getOccupiedSlots = async (venueId, dateOrMonth) => {
    if (dateOrMonth && dateOrMonth.length === 7) {
        const result = await pool.query(
            `SELECT start_time, end_time FROM bookings
             WHERE venue_id = $1 AND status = 'confirmed'
               AND TO_CHAR(start_time AT TIME ZONE 'UTC', 'YYYY-MM') = $2
             UNION
             SELECT start_time, end_time FROM blocked_slots
             WHERE venue_id = $1
               AND TO_CHAR(start_time AT TIME ZONE 'UTC', 'YYYY-MM') = $2`,
            [venueId, dateOrMonth]
        );
        return result.rows;
    } else {
        const result = await pool.query(
            `SELECT start_time, end_time FROM bookings
             WHERE venue_id = $1 AND status = 'confirmed'
               AND (start_time AT TIME ZONE 'UTC')::date = $2::date
             UNION
             SELECT start_time, end_time FROM blocked_slots
             WHERE venue_id = $1
               AND (start_time AT TIME ZONE 'UTC')::date = $2::date`,
            [venueId, dateOrMonth]
        );
        return result.rows;
    }
};

exports.createBooking = async ({ venue_id, client_id, start_time, end_time }) => {
    const conflict = await pool.query(
        `SELECT id FROM bookings
         WHERE venue_id = $1 AND status = 'confirmed'
         AND (start_time, end_time) OVERLAPS ($2, $3)`,
        [venue_id, start_time, end_time]
    );

    if (conflict.rows.length > 0) {
        throw new Error('Termin je već zauzet.');
    }

    // Izračunaj cijenu server-side (ignoriši price_paid sa frontenda)
    const price_paid = await pricingService.getVenuePrice(venue_id, start_time);

    const result = await pool.query(
        `INSERT INTO bookings (venue_id, client_id, start_time, end_time, price_paid, status)
         VALUES ($1, $2, $3, $4, $5, 'confirmed')
         RETURNING *`,
        [venue_id, client_id, start_time, end_time, price_paid]
    );

    const booking = result.rows[0];

    // Dohvati podatke o klijentu, terenu i vlasniku za email
    const info = await pool.query(
        `SELECT u.email as client_email, u.first_name,
                v.name as venue_name, v.city, v.street,
                o.email as owner_email, o.first_name as owner_name
         FROM users u
         JOIN venues v ON v.id = $1
         JOIN users o ON o.id = v.owner_id
         WHERE u.id = $2`,
        [venue_id, client_id]
    );

    if (info.rows.length > 0) {
        const { client_email, first_name, venue_name, city, street, owner_email, owner_name } = info.rows[0];

        // Email klijentu
        mailer.sendMail({
            from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
            to: client_email,
            subject: `✅ Potvrda rezervacije — ${venue_name}`,
            html: `
                <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                    <h2 style="color:#198754;">Rezervacija potvrđena!</h2>
                    <p>Zdravo <strong>${first_name}</strong>,</p>
                    <p>Vaša rezervacija je uspešno kreirana.</p>
                    <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:16px 0;">
                        <p style="margin:4px 0;"><strong>🏟️ Teren:</strong> ${venue_name}</p>
                        <p style="margin:4px 0;"><strong>📍 Lokacija:</strong> ${street}, ${city}</p>
                        <p style="margin:4px 0;"><strong>🕐 Početak:</strong> ${formatDateTime(start_time)}</p>
                        <p style="margin:4px 0;"><strong>🕐 Kraj:</strong> ${formatDateTime(end_time)}</p>
                        <p style="margin:4px 0;"><strong>💰 Cena:</strong> ${price_paid} RSD</p>
                    </div>
                    <p style="color:#666; font-size:13px;">Otkazivanje je moguće najkasnije 24h prije termina.</p>
                </div>
            `
        }).catch(console.error);

        // Email vlasniku
        mailer.sendMail({
            from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
            to: owner_email,
            subject: `📅 Nova rezervacija — ${venue_name}`,
            html: `
                <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                    <h2 style="color:#0d6efd;">Nova rezervacija!</h2>
                    <p>Zdravo <strong>${owner_name}</strong>,</p>
                    <p>Neko je rezervisao termin na vašem objektu.</p>
                    <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:16px 0;">
                        <p style="margin:4px 0;"><strong>🏟️ Teren:</strong> ${venue_name}</p>
                        <p style="margin:4px 0;"><strong>👤 Klijent:</strong> ${first_name}</p>
                        <p style="margin:4px 0;"><strong>🕐 Početak:</strong> ${formatDateTime(start_time)}</p>
                        <p style="margin:4px 0;"><strong>🕐 Kraj:</strong> ${formatDateTime(end_time)}</p>
                        <p style="margin:4px 0;"><strong>💰 Iznos:</strong> ${price_paid} RSD</p>
                    </div>
                </div>
            `
        }).catch(console.error);
    }

    return booking;
};

exports.getUserBookings = async (clientId) => {
    const result = await pool.query(
        `SELECT 
            b.id, b.venue_id, b.start_time, b.end_time, b.price_paid, b.status,
            v.name as venue_name, v.city, v.street,
            (SELECT url FROM venue_images WHERE venue_id = v.id LIMIT 1) as venue_image,
            EXISTS (SELECT 1 FROM reviews WHERE venue_id = v.id AND client_id = b.client_id) as is_reviewed
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         WHERE b.client_id = $1
         ORDER BY 
            CASE 
                -- Prvo buduće rezervacije (confirmed) po najbližem terminu
                WHEN b.status = 'confirmed' AND b.start_time > NOW() THEN 1
                -- Zatim prošle rezervacije (completed) po najnovijoj
                WHEN b.status = 'completed' THEN 2
                -- Na kraju otkazane
                ELSE 3
            END,
            -- Unutar iste grupe, sortiraj po start_time (najbliži prvo za buduće, najnoviji za prošle)
            b.start_time ASC`,
        [clientId]
    );
    return result.rows;
};

exports.cancelBooking = async (bookingId, clientId) => {
    const bookingResult = await pool.query(
        `SELECT b.start_time, b.status, b.end_time, b.price_paid,
                v.name as venue_name, v.city, v.street,
                u.email as client_email, u.first_name,
                o.email as owner_email, o.first_name as owner_name
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         JOIN users u ON u.id = b.client_id
         JOIN users o ON o.id = v.owner_id
         WHERE b.id = $1 AND b.client_id = $2`,
        [bookingId, clientId]
    );

    if (bookingResult.rows.length === 0) throw new Error('Rezervacija nije pronađena.');

    const booking = bookingResult.rows[0];

    if (booking.status !== 'confirmed') throw new Error('Rezervacija je već otkazana ili završena.');

    const timeCheck = await pool.query(
        `SELECT ($1 - NOW() > INTERVAL '24 hours') as can_cancel`,
        [booking.start_time]
    );

    if (!timeCheck.rows[0].can_cancel) throw new Error('Otkazivanje je moguće najkasnije 24h pre termina.');

    const result = await pool.query(
        `UPDATE bookings SET status = 'cancelled_by_client', updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [bookingId]
    );

    const { client_email, first_name, venue_name, city, street, owner_email, owner_name, start_time, end_time } = booking;

    // Email klijentu
    mailer.sendMail({
        from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
        to: client_email,
        subject: `❌ Otkazivanje rezervacije — ${venue_name}`,
        html: `
            <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                <h2 style="color:#dc3545;">Rezervacija otkazana</h2>
                <p>Zdravo <strong>${first_name}</strong>,</p>
                <p>Vaša rezervacija je uspešno otkazana.</p>
                <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:16px 0;">
                    <p style="margin:4px 0;"><strong>🏟️ Teren:</strong> ${venue_name}</p>
                    <p style="margin:4px 0;"><strong>📍 Lokacija:</strong> ${street}, ${city}</p>
                    <p style="margin:4px 0;"><strong>🕐 Početak:</strong> ${formatDateTime(start_time)}</p>
                    <p style="margin:4px 0;"><strong>🕐 Kraj:</strong> ${formatDateTime(end_time)}</p>
                </div>
            </div>
        `
    }).catch(console.error);

    // Email vlasniku
    mailer.sendMail({
        from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
        to: owner_email,
        subject: `❌ Otkazana rezervacija — ${venue_name}`,
        html: `
            <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                <h2 style="color:#dc3545;">Rezervacija otkazana</h2>
                <p>Zdravo <strong>${owner_name}</strong>,</p>
                <p>Klijent <strong>${first_name}</strong> je otkazao rezervaciju.</p>
                <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:16px 0;">
                    <p style="margin:4px 0;"><strong>🏟️ Teren:</strong> ${venue_name}</p>
                    <p style="margin:4px 0;"><strong>🕐 Početak:</strong> ${formatDateTime(start_time)}</p>
                    <p style="margin:4px 0;"><strong>🕐 Kraj:</strong> ${formatDateTime(end_time)}</p>
                </div>
            </div>
        `
    }).catch(console.error);

    return result.rows[0];
};

exports.getOwnerBookings = async (ownerId) => {
    const result = await pool.query(
        `SELECT 
            b.id, b.start_time, b.end_time, b.price_paid, b.status,
            v.name as venue_name,
            u.first_name || ' ' || u.last_name as client_name,
            u.phone as client_phone, u.email as client_email
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         JOIN users u ON b.client_id = u.id
         WHERE v.owner_id = $1
         ORDER BY b.start_time DESC`,
        [ownerId]
    );
    return result.rows;
};

exports.blockSlot = async ({ venue_id, start_time, end_time, reason }) => {
    const conflict = await pool.query(
        `SELECT id FROM bookings WHERE venue_id = $1 AND status = 'confirmed' 
         AND (start_time, end_time) OVERLAPS ($2, $3)
         UNION
         SELECT id FROM blocked_slots WHERE venue_id = $1
         AND (start_time, end_time) OVERLAPS ($2, $3)`,
        [venue_id, start_time, end_time]
    );

    if (conflict.rows.length > 0) throw new Error('Termin se preklapa sa postojećom rezervacijom ili blokadom.');

    const result = await pool.query(
        `INSERT INTO blocked_slots (venue_id, start_time, end_time, reason)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [venue_id, start_time, end_time, reason || 'Vlasnik blokirao termin']
    );
    return result.rows[0];
};

exports.getBookingDetails = async (bookingId) => {
    const result = await pool.query(
        `SELECT 
            b.id, b.start_time, b.end_time, b.price_paid, b.status, b.client_id,
            v.name as venue_name, v.street as address, v.city, v.owner_id,
            u.first_name, u.last_name, u.email, u.phone
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         JOIN users u ON b.client_id = u.id
         WHERE b.id = $1`,
        [bookingId]
    );
    return result.rows[0];
};

exports.cancelByOwner = async (bookingId, ownerId) => {
    const bookingResult = await pool.query(
        `SELECT b.id, b.status, b.start_time, b.end_time, b.price_paid,
                v.owner_id, v.name as venue_name, v.city, v.street,
                u.email as client_email, u.first_name as client_name,
                o.first_name as owner_name
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         JOIN users u ON u.id = b.client_id
         JOIN users o ON o.id = v.owner_id
         WHERE b.id = $1`,
        [bookingId]
    );

    if (bookingResult.rows.length === 0) throw new Error('Rezervacija nije pronađena.');

    const booking = bookingResult.rows[0];

    if (booking.owner_id !== ownerId) throw new Error('Nemate ovlašćenje da otkažete ovu rezervaciju.');
    if (booking.status !== 'confirmed') throw new Error('Moguće je otkazati samo potvrđene rezervacije.');

    const result = await pool.query(
        `UPDATE bookings SET status = 'cancelled_by_owner', updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [bookingId]
    );

    const { client_email, client_name, venue_name, city, street, start_time, end_time, owner_name } = booking;

    // Email klijentu od vlasnika
    mailer.sendMail({
        from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
        to: client_email,
        subject: `❌ Vlasnik otkazao rezervaciju — ${venue_name}`,
        html: `
            <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                <h2 style="color:#dc3545;">Rezervacija otkazana od vlasnika</h2>
                <p>Zdravo <strong>${client_name}</strong>,</p>
                <p>Nažalost, vlasnik terena je otkazao vašu rezervaciju.</p>
                <div style="background:#fff3cd; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #ffc107;">
                    <p style="margin:4px 0;"><strong>🏟️ Teren:</strong> ${venue_name}</p>
                    <p style="margin:4px 0;"><strong>📍 Lokacija:</strong> ${street}, ${city}</p>
                    <p style="margin:4px 0;"><strong>🕐 Početak:</strong> ${formatDateTime(start_time)}</p>
                    <p style="margin:4px 0;"><strong>🕐 Kraj:</strong> ${formatDateTime(end_time)}</p>
                </div>
                <p style="color:#666; font-size:13px;">Možete rezervisati drugi termin na našoj platformi.</p>
            </div>
        `
    }).catch(console.error);

    return result.rows[0];
};


exports.createRecurring = async ({ venue_id, client_id, start_time, end_time, weeks }) => {
    const created = [];
    const failed = [];

    // Svi recurring termini su isti dan u sedmici → cijena je ista za sve
    const price_paid = await pricingService.getVenuePrice(venue_id, start_time);

    for (let i = 0; i < weeks; i++) {
        const start = new Date(start_time);
        const end = new Date(end_time);

        start.setDate(start.getDate() + i * 7);
        end.setDate(end.getDate() + i * 7);

        // Provjeri konflikt
        const conflict = await pool.query(
            `SELECT id FROM bookings
             WHERE venue_id = $1 AND status = 'confirmed'
             AND (start_time, end_time) OVERLAPS ($2, $3)`,
            [venue_id, start.toISOString(), end.toISOString()]
        );

        if (conflict.rows.length > 0) {
            failed.push(start.toLocaleDateString('sr-RS'));
            continue;
        }

        const result = await pool.query(
            `INSERT INTO bookings (venue_id, client_id, start_time, end_time, price_paid, status)
             VALUES ($1, $2, $3, $4, $5, 'confirmed')
             RETURNING *`,
            [venue_id, client_id, start.toISOString(), end.toISOString(), price_paid]
        );
        created.push(result.rows[0]);
    }

    // Pošalji email ako je bar jedan kreiran
    if (created.length > 0) {
        const info = await pool.query(
            `SELECT u.email as client_email, u.first_name,
                    v.name as venue_name, v.city, v.street,
                    o.email as owner_email, o.first_name as owner_name
             FROM users u
             JOIN venues v ON v.id = $1
             JOIN users o ON o.id = v.owner_id
             WHERE u.id = $2`,
            [venue_id, client_id]
        );

        if (info.rows.length > 0) {
            const { client_email, first_name, venue_name, city, street, owner_email, owner_name } = info.rows[0];

            const terminList = created.map(b =>
                `<li>${formatDateTime(b.start_time)} — ${formatDateTime(b.end_time)}</li>`
            ).join('');

            const failedList = failed.length > 0
                ? `<p style="color:#dc3545;">⚠️ Sljedeći termini nisu mogli biti rezervisani (već zauzeti): <strong>${failed.join(', ')}</strong></p>`
                : '';

            mailer.sendMail({
                from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
                to: client_email,
                subject: `✅ Potvrda ponavljajućih rezervacija — ${venue_name}`,
                html: `
                    <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                        <h2 style="color:#198754;">Rezervacije potvrđene!</h2>
                        <p>Zdravo <strong>${first_name}</strong>,</p>
                        <p>Uspešno ste rezervisali <strong>${created.length}</strong> termina na terenu <strong>${venue_name}</strong>.</p>
                        <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:16px 0;">
                            <p style="margin:4px 0;"><strong>📍 Lokacija:</strong> ${street}, ${city}</p>
                            <p style="margin:4px 0;"><strong>💰 Cena po terminu:</strong> ${price_paid} RSD</p>
                            <p style="margin:8px 0 4px;"><strong>📅 Rezervisani termini:</strong></p>
                            <ul style="margin:0; padding-left:20px;">${terminList}</ul>
                        </div>
                        ${failedList}
                    </div>
                `
            }).catch(console.error);

            mailer.sendMail({
                from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
                to: owner_email,
                subject: `📅 Nova ponavljajuća rezervacija — ${venue_name}`,
                html: `
                    <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                        <h2 style="color:#0d6efd;">Nova ponavljajuća rezervacija!</h2>
                        <p>Zdravo <strong>${owner_name}</strong>,</p>
                        <p>Klijent <strong>${first_name}</strong> je rezervisao <strong>${created.length}</strong> termina.</p>
                        <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:16px 0;">
                            <ul style="margin:0; padding-left:20px;">${terminList}</ul>
                        </div>
                    </div>
                `
            }).catch(console.error);
        }
    }

    return { created: created.length, failed, bookings: created };
};