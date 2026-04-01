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

    // Provjeri da klijent nije već ostavio recenziju za ovaj teren
    const existing = await pool.query(
        'SELECT id FROM reviews WHERE venue_id = $1 AND client_id = $2',
        [venue_id, client_id]
    );

    if (existing.rows.length > 0) {
        throw new Error('Već ste ostavili recenziju za ovaj teren.');
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

exports.updateReview = async (reviewId, clientId, { rating, comment }) => {
    const result = await pool.query(
        `UPDATE reviews SET rating = $1, comment = $2
         WHERE id = $3 AND client_id = $4 RETURNING *`,
        [rating, comment, reviewId, clientId]
    );
    if (result.rows.length === 0) {
        throw new Error('Recenzija nije pronađena ili nemate pravo izmjene.');
    }
    return result.rows[0];
};

exports.deleteReview = async (reviewId, clientId) => {
    const result = await pool.query(
        'DELETE FROM reviews WHERE id = $1 AND client_id = $2 RETURNING *',
        [reviewId, clientId]
    );
    if (result.rows.length === 0) {
        throw new Error('Recenzija nije pronađena ili nemate pravo brisanja.');
    }
    return result.rows[0];
};