const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

exports.getStats = async () => {
  const [users, venues, bookings, earnings] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM users WHERE role != 'admin'`),
    pool.query(`SELECT COUNT(*) FROM venues`),
    pool.query(`SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'`),
    pool.query(`SELECT COALESCE(SUM(price_paid), 0) as total FROM bookings WHERE status IN ('confirmed', 'completed')`)
  ]);

  return {
    totalUsers: parseInt(users.rows[0].count),
    totalVenues: parseInt(venues.rows[0].count),
    activeBookings: parseInt(bookings.rows[0].count),
    totalEarnings: parseFloat(earnings.rows[0].total)
  };
};

exports.getAllUsers = async () => {
  const result = await pool.query(
    `SELECT id, email, first_name, last_name, phone, role, is_active, created_at
     FROM users
     WHERE role != 'admin'
     ORDER BY created_at DESC`
  );
  return result.rows;
};

exports.toggleUserActive = async (userId) => {
  const result = await pool.query(
    `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
     WHERE id = $1 RETURNING id, is_active`,
    [userId]
  );
  if (result.rows.length === 0) throw new Error('Korisnik nije pronađen');
  return result.rows[0];
};

exports.getAllVenues = async () => {
  const result = await pool.query(
    `SELECT v.*, 
      u.first_name || ' ' || u.last_name as owner_name,
      u.email as owner_email,
      s.name as sport_name,
      (SELECT url FROM venue_images WHERE venue_id = v.id ORDER BY display_order ASC LIMIT 1) as main_image
     FROM venues v
     JOIN users u ON v.owner_id = u.id
     JOIN sports s ON v.sport_id = s.id
     ORDER BY v.created_at DESC`
  );
  return result.rows;
};

exports.toggleVenueActive = async (venueId) => {
  const result = await pool.query(
    `UPDATE venues SET is_active = NOT is_active, updated_at = NOW()
     WHERE id = $1 RETURNING id, is_active`,
    [venueId]
  );
  if (result.rows.length === 0) throw new Error('Teren nije pronađen');
  return result.rows[0];
};

exports.deleteVenue = async (venueId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const imagesResult = await client.query('SELECT url FROM venue_images WHERE venue_id = $1', [venueId]);
    await client.query('DELETE FROM working_hours WHERE venue_id = $1', [venueId]);
    await client.query('DELETE FROM venue_images WHERE venue_id = $1', [venueId]);
    await client.query('DELETE FROM venues WHERE id = $1', [venueId]);
    await client.query('COMMIT');

    imagesResult.rows.forEach(img => {
      const filePath = path.join(process.cwd(), img.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};