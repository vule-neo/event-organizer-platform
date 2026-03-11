const cron = require('node-cron');
const pool = require('../config/db');

// Ova funkcija će raditi "prljav posao"
const completePastBookings = async () => {
    try {
        console.log('--- Pokrećem proveru završenih termina ---');
        
        // Tražimo potvrđene termine koji su završeni pre više od 30 minuta
        // A status im je još uvek 'confirmed'
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

// Postavljamo da se proverava na svakih 15 minuta
// Sintaksa: minuta, sati, dan, mesec, dan_u_nedelji
const initCron = () => {
    cron.schedule('*/15 * * * *', () => {
        completePastBookings();
    });
};

module.exports = { initCron };