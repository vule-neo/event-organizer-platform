const pool = require('../config/db');

exports.getOccupiedSlots = async (venueId, date) => {
    // Uzimamo i rezervacije i blokirane termine za taj dan
    const result = await pool.query(
        `SELECT start_time, end_time FROM bookings 
         WHERE venue_id = $1 AND status = 'confirmed' AND start_time::date = $2
         UNION
         SELECT start_time, end_time FROM blocked_slots 
         WHERE venue_id = $1 AND start_time::date = $2`,
        [venueId, date]
    );
    
    return result.rows;
};

exports.createBooking = async ({ venue_id, client_id, start_time, end_time, price_paid }) => {
    // 1. Provera preklapanja (Double-check iako imamo index)
    const conflict = await pool.query(
        `SELECT id FROM bookings 
         WHERE venue_id = $1 AND status = 'confirmed'
         AND (start_time, end_time) OVERLAPS ($2, $3)`,
        [venue_id, start_time, end_time]
    );

    if (conflict.rows.length > 0) {
        throw new Error('Termin je već zauzet.');
    }

    // 2. Insert u bazu
    const result = await pool.query(
        `INSERT INTO bookings (venue_id, client_id, start_time, end_time, price_paid, status)
         VALUES ($1, $2, $3, $4, $5, 'confirmed')
         RETURNING *`,
        [venue_id, client_id, start_time, end_time, price_paid]
    );

    return result.rows[0];
};

exports.getUserBookings = async (clientId) => {
    const result = await pool.query(
        `SELECT 
            b.id, 
            b.venue_id, 
            b.start_time, 
            b.end_time, 
            b.price_paid, 
            b.status,
            v.name as venue_name,
            v.city,
            v.street,
            (SELECT url FROM venue_images WHERE venue_id = v.id LIMIT 1) as venue_image,
            -- Provera da li je klijent već ostavio recenziju za ovaj booking
            EXISTS (SELECT 1 FROM reviews WHERE booking_id = b.id) as is_reviewed
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         WHERE b.client_id = $1
         ORDER BY b.start_time DESC`,
        [clientId]
    );
    return result.rows;
};

exports.cancelBooking = async (bookingId, clientId) => {
    // 1. Proveravamo da li rezervacija postoji, da li pripada tom klijentu i da li je više od 24h do početka
    const bookingResult = await pool.query(
        `SELECT start_time, status FROM bookings 
         WHERE id = $1 AND client_id = $2`,
        [bookingId, clientId]
    );

    if (bookingResult.rows.length === 0) {
        throw new Error('Rezervacija nije pronađena.');
    }

    const booking = bookingResult.rows[0];

    // Provera da li je već otkazana
    if (booking.status !== 'confirmed') {
        throw new Error('Rezervacija je već otkazana ili završena.');
    }

    // Provera 24h (PostgreSQL interval)
    const timeCheck = await pool.query(
        `SELECT ($1 - NOW() > INTERVAL '24 hours') as can_cancel`,
        [booking.start_time]
    );

    if (!timeCheck.rows[0].can_cancel) {
        throw new Error('Otkazivanje je moguće najkasnije 24h pre termina.');
    }

    // 2. Menjamo status u 'cancelled_by_client'
    const result = await pool.query(
        `UPDATE bookings 
         SET status = 'cancelled_by_client', updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [bookingId]
    );

    return result.rows[0];
};


exports.getOwnerBookings = async (ownerId) => {
    const result = await pool.query(
        `SELECT 
            b.id, 
            b.start_time, 
            b.end_time, 
            b.price_paid, 
            b.status,
            v.name as venue_name,
            u.first_name || ' ' || u.last_name as client_name,
            u.phone as client_phone,
            u.email as client_email
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
    // Proveravamo da li se već preklapa sa nekom rezervacijom ili drugom blokadom
    const conflict = await pool.query(
        `SELECT id FROM bookings WHERE venue_id = $1 AND status = 'confirmed' 
         AND (start_time, end_time) OVERLAPS ($2, $3)
         UNION
         SELECT id FROM blocked_slots WHERE venue_id = $1
         AND (start_time, end_time) OVERLAPS ($2, $3)`,
        [venue_id, start_time, end_time]
    );

    if (conflict.rows.length > 0) {
        throw new Error('Termin se preklapa sa postojećom rezervacijom ili blokadom.');
    }

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
            b.id, 
            b.start_time, 
            b.end_time, 
            b.price_paid, 
            b.status,
            b.client_id,
            v.name as venue_name, 
            v.street as address, -- Proveri da li se kolona zove street ili address
            v.city,
            v.owner_id,
            u.first_name, 
            u.last_name, 
            u.email, 
            u.phone
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         JOIN users u ON b.client_id = u.id
         WHERE b.id = $1`,
        [bookingId]
    );
    return result.rows[0];
};


exports.cancelByOwner = async (bookingId, ownerId) => {
    // 1. Provera vlasništva nad terenom preko bookinga
    const bookingResult = await pool.query(
        `SELECT b.id, b.status, v.owner_id 
         FROM bookings b
         JOIN venues v ON b.venue_id = v.id
         WHERE b.id = $1`,
        [bookingId]
    );

    if (bookingResult.rows.length === 0) {
        throw new Error('Rezervacija nije pronađena.');
    }

    const booking = bookingResult.rows[0];

    if (booking.owner_id !== ownerId) {
        throw new Error('Nemate ovlašćenje da otkažete ovu rezervaciju.');
    }

    if (booking.status !== 'confirmed') {
        throw new Error('Moguće je otkazati samo potvrđene rezervacije.');
    }

    // 2. Markiramo kao 'cancelled_by_owner'
    // Ovde bi u budućnosti išla logika za automatski refund novca klijentu!
    const result = await pool.query(
        `UPDATE bookings 
         SET status = 'cancelled_by_owner', updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [bookingId]
    );

    return result.rows[0];
};