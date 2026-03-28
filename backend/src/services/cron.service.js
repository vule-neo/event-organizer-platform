const cron = require('node-cron');
const pool = require('../config/db');
const mailer = require('../config/mailer');

const completePastBookings = async () => {
    try {
        console.log('--- Pokrećem proveru završenih termina ---');
        const result = await pool.query(`
            UPDATE bookings 
            SET status = 'completed', updated_at = NOW()
            WHERE status = 'confirmed' 
              AND end_time < (NOW() - INTERVAL '30 minutes')
            RETURNING id, venue_id;
        `);
        if (result.rowCount > 0) {
            console.log(`Uspešno završeno ${result.rowCount} termina.`);
        }
    } catch (err) {
        console.error('Greška u Cron Job-u:', err.message);
    }
};

const sendReminders = async () => {
    try {
        console.log('--- Pokrećem slanje podsjetnika ---');

        // Nađi sve confirmed termine koji počinju između 23h i 25h od sad
        const result = await pool.query(`
            SELECT 
                b.id, b.start_time, b.end_time, b.price_paid,
                u.email as client_email, u.first_name,
                v.name as venue_name, v.city, v.street
            FROM bookings b
            JOIN users u ON u.id = b.client_id
            JOIN venues v ON v.id = b.venue_id
            WHERE b.status = 'confirmed'
              AND b.reminder_sent = FALSE
              AND b.start_time BETWEEN (NOW() + INTERVAL '23 hours') 
                                   AND (NOW() + INTERVAL '25 hours')
        `);

        if (result.rowCount === 0) return;

        console.log(`Šaljem ${result.rowCount} podsjetnika...`);

        for (const booking of result.rows) {
            await mailer.sendMail({
                from: `"Sportski Tereni" <${process.env.EMAIL_USER}>`,
                to: booking.client_email,
                subject: `⏰ Podsjetnik — termin sutra na ${booking.venue_name}`,
                html: `
                    <div style="font-family:Arial,sans-serif; max-width:500px; margin:auto; padding:32px; border:1px solid #e0e0e0; border-radius:12px;">
                        <h2 style="color:#0d6efd;">Podsjetnik za sutrašnji termin</h2>
                        <p>Zdravo <strong>${booking.first_name}</strong>,</p>
                        <p>Podsjećamo vas da imate rezervisan termin <strong>sutra</strong>.</p>
                        <div style="background:#f8f9fa; border-radius:8px; padding:16px; margin:16px 0;">
                            <p style="margin:4px 0;"><strong>🏟️ Teren:</strong> ${booking.venue_name}</p>
                            <p style="margin:4px 0;"><strong>📍 Lokacija:</strong> ${booking.street}, ${booking.city}</p>
                            <p style="margin:4px 0;"><strong>🕐 Početak:</strong> ${formatDateTime(booking.start_time)}</p>
                            <p style="margin:4px 0;"><strong>🕐 Kraj:</strong> ${formatDateTime(booking.end_time)}</p>
                            <p style="margin:4px 0;"><strong>💰 Cena:</strong> ${booking.price_paid} RSD</p>
                        </div>
                        <p style="color:#dc3545; font-size:13px;">⚠️ Otkazivanje je moguće najkasnije 24h prije termina.</p>
                    </div>
                `
            });

            // Označi da je podsjetnik poslan
            await pool.query(
                'UPDATE bookings SET reminder_sent = TRUE WHERE id = $1',
                [booking.id]
            );
        }

        console.log('Podsjetnici poslani.');
    } catch (err) {
        console.error('Greška u sendReminders:', err.message);
    }
};

const formatDateTime = (dt) => {
    const d = new Date(dt);
    return d.toLocaleString('sr-RS', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const initCron = () => {
    // Svakih 15 minuta — završeni termini
    cron.schedule('*/15 * * * *', () => {
        completePastBookings();
    });

    // Svaki sat — podsjetnici
    cron.schedule('0 * * * *', () => {
        sendReminders();
    });
};

module.exports = { initCron };