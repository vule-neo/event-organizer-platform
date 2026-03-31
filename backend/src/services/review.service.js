const pool = require('../config/db');

exports.createReview = async ({ booking_id, venue_id, client_id, rating, comment }) => {
    // Provjeri da booking postoji, da je klijentov, i da NIJE otkazan
    // Prihvata i 'confirmed' i 'completed' — cron možda još nije pokrenuo update
    // Ali end_time mora biti u prošlosti
    const booking = await pool.query(
        `SELECT id, end_time FROM bookings 
         WHERE id = $1 
           AND client_id = $2 
           AND status NOT IN ('cancelled_by_client', 'cancelled_by_owner')
           AND end_time < NOW()`,
        [booking_id, client_id]
    );

    if (booking.rows.length === 0) {
        throw new Error('Rezervacija nije pronađena, nije završena ili je otkazana.');
    }

    // Provjeri da recenzija već ne postoji za ovaj booking
    const existing = await pool.query(
        'SELECT id FROM reviews WHERE booking_id = $1',
        [booking_id]
    );

    if (existing.rows.length > 0) {
        throw new Error('Već ste ostavili recenziju za ovaj termin.');
    }

    // Upiši recenziju
    const result = await pool.query(
        `INSERT INTO reviews (venue_id, client_id, booking_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [venue_id, client_id, booking_id, rating, comment]
    );

    return result.rows[0];
};

exports.getVenueReviews = async (venueId) => {
    const result = await pool.query(
        `SELECT r.*, u.first_name, u.last_name 
         FROM reviews r 
         JOIN users u ON r.client_id = u.id 
         WHERE r.venue_id = $1 
         ORDER BY r.created_at DESC`,
        [venueId]
    );
    return result.rows;
};