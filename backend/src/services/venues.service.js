const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

exports.createVenue = async (venueData, files) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venueResult = await client.query(`
      INSERT INTO venues (
        owner_id, sport_id, name, country, city, street, 
        lat, lng, price_per_slot, slot_duration_mins, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `, [
      venueData.owner_id,
      venueData.sport_id,
      venueData.name,
      venueData.country || 'Srbija',
      venueData.city,
      venueData.street,
      venueData.lat,
      venueData.lng,
      venueData.price_per_slot,
      venueData.slot_duration_mins,
      venueData.description
    ]);

    const venueId = venueResult.rows[0].id;

    if (venueData.working_hours) {
      const workingHours = typeof venueData.working_hours === 'string'
        ? JSON.parse(venueData.working_hours)
        : venueData.working_hours;

      for (const day of workingHours) {
        await client.query(
          `INSERT INTO working_hours (venue_id, day_of_week, is_open, open_time, close_time) 
           VALUES ($1, $2, $3, $4, $5)`,
          [venueId, day.day_of_week, day.is_open,
            day.is_open ? day.open_time : null,
            day.is_open ? day.close_time : null]
        );
      }
    }

    if (venueData.tags) {
      const tags = typeof venueData.tags === 'string'
        ? JSON.parse(venueData.tags)
        : venueData.tags;

      for (const tagId of tags) {
        await client.query(
          `INSERT INTO venue_tag_map (venue_id, tag_id) VALUES ($1, $2)`,
          [venueId, tagId]
        );
      }
    }

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await client.query(
          `INSERT INTO venue_images (venue_id, url, display_order) VALUES ($1, $2, $3)`,
          [venueId, `/uploads/venues/${files[i].filename}`, i]
        );
      }
    }

    await client.query('COMMIT');
    return { message: 'Uspešno kreirano', venueId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.updateVenue = async (venueId, body, files) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      name, sport_id, city, street, lat, lng,
      price_per_slot, slot_duration_mins, description,
      working_hours, imagesToDelete, tags
    } = body;

    await client.query(
      `UPDATE venues 
       SET name=$1, sport_id=$2, city=$3, street=$4, lat=$5, lng=$6,
           price_per_slot=$7, slot_duration_mins=$8, description=$9, updated_at=NOW()
       WHERE id=$10`,
      [name, sport_id, city, street, lat, lng,
        price_per_slot, slot_duration_mins, description, venueId]
    );

    if (working_hours) {
      await client.query('DELETE FROM working_hours WHERE venue_id = $1', [venueId]);
      const hours = typeof working_hours === 'string' ? JSON.parse(working_hours) : working_hours;
      for (const h of hours) {
        await client.query(
          `INSERT INTO working_hours (venue_id, day_of_week, is_open, open_time, close_time)
           VALUES ($1, $2, $3, $4, $5)`,
          [venueId, h.day_of_week, h.is_open,
            h.is_open ? h.open_time : null,
            h.is_open ? h.close_time : null]
        );
      }
    }

    await client.query('DELETE FROM venue_tag_map WHERE venue_id = $1', [venueId]);
    if (tags) {
      const tagList = typeof tags === 'string' ? JSON.parse(tags) : tags;
      for (const tagId of tagList) {
        await client.query(
          `INSERT INTO venue_tag_map (venue_id, tag_id) VALUES ($1, $2)`,
          [venueId, tagId]
        );
      }
    }

    if (imagesToDelete) {
      const idsToRemove = typeof imagesToDelete === 'string' ? JSON.parse(imagesToDelete) : imagesToDelete;
      if (Array.isArray(idsToRemove) && idsToRemove.length > 0) {
        const filesToDelRes = await client.query(
          'SELECT url FROM venue_images WHERE id = ANY($1)', [idsToRemove]
        );
        await client.query('DELETE FROM venue_images WHERE id = ANY($1)', [idsToRemove]);
        filesToDelRes.rows.forEach(img => {
          const filePath = path.join(process.cwd(), img.url);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      }
    }

    if (files && files.length > 0) {
      const maxOrderRes = await client.query(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM venue_images WHERE venue_id = $1',
        [venueId]
      );
      let currentOrder = maxOrderRes.rows[0].max_order + 1;
      for (const file of files) {
        await client.query(
          `INSERT INTO venue_images (venue_id, url, display_order) VALUES ($1, $2, $3)`,
          [venueId, `/uploads/venues/${file.filename}`, currentOrder++]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, message: 'Teren uspešno ažuriran' };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('UpdateVenue Error:', err);
    throw err;
  } finally {
    client.release();
  }
};

exports.getVenuesForOwner = async (ownerId) => {
  const result = await pool.query(
    `SELECT v.*, 
      (SELECT url FROM venue_images WHERE venue_id = v.id ORDER BY display_order ASC LIMIT 1) as main_image,
      COALESCE(
        json_agg(
          json_build_object('id', vt.id, 'name', vt.name, 'icon', vt.icon)
        ) FILTER (WHERE vt.id IS NOT NULL), 
        '[]'
      ) as tags
     FROM venues v
     LEFT JOIN venue_tag_map vtm ON vtm.venue_id = v.id
     LEFT JOIN venue_tags vt ON vt.id = vtm.tag_id
     WHERE v.owner_id = $1
     GROUP BY v.id
     ORDER BY v.created_at DESC`,
    [ownerId]
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

exports.getVenueById = async (id) => {
  const venue = await pool.query(
    `SELECT id, owner_id, name, country, city, street, price_per_slot,
            currency, slot_duration_mins, description, is_active,
            avg_rating, review_count, created_at, sport_id
     FROM venues WHERE id = $1`,
    [id]
  );

  if (venue.rows.length === 0) throw new Error('Not found');

  const hours = await pool.query(
    'SELECT * FROM working_hours WHERE venue_id = $1 ORDER BY day_of_week ASC', [id]
  );
  const images = await pool.query(
    'SELECT * FROM venue_images WHERE venue_id = $1', [id]
  );
  const tags = await pool.query(
    `SELECT vt.id, vt.name, vt.slug, vt.icon 
     FROM venue_tag_map vtm
     JOIN venue_tags vt ON vtm.tag_id = vt.id
     WHERE vtm.venue_id = $1`,
    [id]
  );

  return {
    ...venue.rows[0],
    working_hours: hours.rows,
    images: images.rows,
    tags: tags.rows
  };
};

exports.deleteVenue = async (venueId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if venue has any bookings
    const bookingCheck = await client.query(
      'SELECT COUNT(*) FROM bookings WHERE venue_id = $1', [venueId]
    );
    const hasBookings = parseInt(bookingCheck.rows[0].count) > 0;

    if (hasBookings) {
      // Soft delete — deactivate venue, cancel any pending/confirmed future bookings
      await client.query(
        `UPDATE venues SET is_active = false WHERE id = $1`, [venueId]
      );
      await client.query(
        `UPDATE bookings 
         SET status = 'cancelled_by_owner' 
         WHERE venue_id = $1 
           AND status = 'confirmed'
           AND start_time > NOW()`,
        [venueId]
      );
      await client.query('COMMIT');
      return { success: true, softDeleted: true };
    }

    // No bookings — safe to fully delete
    const imagesResult = await client.query(
      'SELECT url FROM venue_images WHERE venue_id = $1', [venueId]
    );
    await client.query('DELETE FROM working_hours WHERE venue_id = $1', [venueId]);
    await client.query('DELETE FROM venue_tag_map WHERE venue_id = $1', [venueId]);
    await client.query('DELETE FROM venue_images WHERE venue_id = $1', [venueId]);
    await client.query('DELETE FROM venues WHERE id = $1', [venueId]);
    await client.query('COMMIT');

    imagesResult.rows.forEach(img => {
      const filePath = path.join(process.cwd(), img.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    return { success: true, softDeleted: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.getAllVenues = async () => {
  const result = await pool.query(
    `SELECT v.*, 
      (SELECT url FROM venue_images WHERE venue_id = v.id LIMIT 1) as main_image,
      COALESCE(
        json_agg(
          json_build_object('id', vt.id, 'name', vt.name, 'icon', vt.icon)
        ) FILTER (WHERE vt.id IS NOT NULL), 
        '[]'
      ) as tags
     FROM venues v
     LEFT JOIN venue_tag_map vtm ON vtm.venue_id = v.id
     LEFT JOIN venue_tags vt ON vt.id = vtm.tag_id
     WHERE v.is_active = TRUE
     GROUP BY v.id
     ORDER BY v.created_at DESC`
  );
  return result.rows;
};

exports.getAllSports = async () => {
  const result = await pool.query('SELECT * FROM sports ORDER BY name ASC');
  return result.rows;
};

exports.getAllTags = async () => {
  const result = await pool.query('SELECT * FROM venue_tags ORDER BY name ASC');
  return result.rows;
};

// ---- NOVO ----
exports.getPublicStats = async () => {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM venues WHERE is_active = true)::int AS total_venues,
      (SELECT COUNT(*) FROM users WHERE role = 'customer' AND is_active = true)::int AS total_users,
      (SELECT COUNT(*) FROM bookings)::int AS total_bookings
  `);
  return result.rows[0];
};