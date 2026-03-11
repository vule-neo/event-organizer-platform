const pool = require('../config/db');

exports.createReview = async ({ booking_id, venue_id, client_id, rating, comment }) => {
    // 1. Provera da li je termin završen (completed) i da li je klijentov
    const booking = await pool.query(
        "SELECT id FROM bookings WHERE id = $1 AND client_id = $2 AND status = 'completed'",
        [booking_id, client_id]
    );

    if (booking.rows.length === 0) {
        throw new Error('Možete oceniti samo završene termine koje ste vi rezervisali.');
    }

    // 2. Upis recenzije
    // (Tvoj triger u bazi će automatski osvežiti avg_rating u venues)
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