const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Kreira teren, radno vreme i slike
 */
exports.createVenue = async (venueData, files) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venueQuery = `
      INSERT INTO venues (
        owner_id, sport_id, name, country, city, street, 
        lat, lng, price_per_slot, slot_duration_mins, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `;

    const venueValues = [
      venueData.owner_id,
      venueData.sport_id, // DODATO
      venueData.name,
      venueData.country || 'Srbija',
      venueData.city,
      venueData.street,
      venueData.lat,  // DODATO
      venueData.lng,  // DODATO
      venueData.price_per_slot,
      venueData.slot_duration_mins,
      venueData.description
    ];

    const venueResult = await client.query(venueQuery, venueValues);
    const venueId = venueResult.rows[0].id;

    // ... ostatak koda za working_hours i slike ostaje ISTI ...
    if (venueData.working_hours) {
        const workingHours = typeof venueData.working_hours === 'string' 
          ? JSON.parse(venueData.working_hours) 
          : venueData.working_hours;
  
        const hoursQuery = `
          INSERT INTO working_hours (venue_id, day_of_week, is_open, open_time, close_time) 
          VALUES ($1, $2, $3, $4, $5);
        `;
  
        for (const day of workingHours) {
          await client.query(hoursQuery, [
            venueId, day.day_of_week, day.is_open,
            day.is_open ? day.open_time : null,
            day.is_open ? day.close_time : null
          ]);
        }
      }
  
      if (files && files.length > 0) {
        const imageQuery = `INSERT INTO venue_images (venue_id, url, display_order) VALUES ($1, $2, $3)`;
        for (let i = 0; i < files.length; i++) {
          await client.query(imageQuery, [venueId, `/uploads/venues/${files[i].filename}`, i]);
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

/**
 * AŽURIRANJE TERENA (Edit)
 */
exports.updateVenue = async (venueId, body, files) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Izvlačimo sve potrebne podatke iz body-ja (uključujući sport, lat i lng)
    const { 
      name, 
      sport_id, 
      city, 
      street, 
      lat, 
      lng, 
      price_per_slot, 
      slot_duration_mins, 
      description, 
      working_hours, 
      imagesToDelete 
    } = body;

    // 1. Update osnovnih podataka (DODATI: sport_id, lat, lng)
    await client.query(
      `UPDATE venues 
       SET name = $1, 
           sport_id = $2, 
           city = $3, 
           street = $4, 
           lat = $5, 
           lng = $6, 
           price_per_slot = $7, 
           slot_duration_mins = $8, 
           description = $9, 
           updated_at = NOW()
       WHERE id = $10`,
      [
        name, 
        sport_id, 
        city, 
        street, 
        lat, 
        lng, 
        price_per_slot, 
        slot_duration_mins, 
        description, 
        venueId
      ]
    );

    // 2. Update radnog vremena (Re-insert metoda)
    if (working_hours) {
      // Prvo brišemo stara radna vremena
      await client.query('DELETE FROM working_hours WHERE venue_id = $1', [venueId]);
      
      const hours = typeof working_hours === 'string' ? JSON.parse(working_hours) : working_hours;
      
      for (const h of hours) {
        await client.query(
          `INSERT INTO working_hours (venue_id, day_of_week, is_open, open_time, close_time)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            venueId, 
            h.day_of_week, 
            h.is_open, 
            h.is_open ? h.open_time : null, 
            h.is_open ? h.close_time : null
          ]
        );
      }
    }

    // 3. BRISANJE ODABRANIH SLIKA (sa baze i diska)
    if (imagesToDelete) {
      const idsToRemove = typeof imagesToDelete === 'string' ? JSON.parse(imagesToDelete) : imagesToDelete;
      
      if (Array.isArray(idsToRemove) && idsToRemove.length > 0) {
        // Uzimamo putanje pre brisanja da bismo mogli da ih obrišemo sa diska
        const filesToDelRes = await client.query(
          'SELECT url FROM venue_images WHERE id = ANY($1)', 
          [idsToRemove]
        );

        // Brišemo iz baze
        await client.query('DELETE FROM venue_images WHERE id = ANY($1)', [idsToRemove]);

        // Brišemo fizičke fajlove
        filesToDelRes.rows.forEach(img => {
          const filePath = path.join(process.cwd(), img.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
    }

    // 4. DODAVANJE NOVIH SLIKA
    if (files && files.length > 0) {
      const imageQuery = `INSERT INTO venue_images (venue_id, url, display_order) VALUES ($1, $2, $3)`;
      
      // Uzmemo trenutni max order da nove slike idu na kraj (opciono)
      const maxOrderRes = await client.query('SELECT COALESCE(MAX(display_order), 0) as max_order FROM venue_images WHERE venue_id = $1', [venueId]);
      let currentOrder = maxOrderRes.rows[0].max_order + 1;

      for (const file of files) {
        const imageUrl = `/uploads/venues/${file.filename}`;
        await client.query(imageQuery, [venueId, imageUrl, currentOrder]);
        currentOrder++;
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
      v.avg_rating,     -- <--- DODATO
      v.review_count    -- <--- DODATO
     FROM venues v 
     WHERE v.owner_id = $1 
     ORDER BY v.created_at DESC`,
    [ownerId]
  );
  return result.rows;
};

exports.getVenueById = async (id) => {
  // Dodali smo avg_rating i review_count u osnovni query
  const venue = await pool.query(
    `SELECT id, owner_id, name, country, city, street, price_per_slot, 
            currency, slot_duration_mins, description, is_active, 
            avg_rating, review_count, created_at, sport_id 
     FROM venues WHERE id = $1`, // <--- DODATO sport_id OVDE
    [id]
  );
  
  const hours = await pool.query('SELECT * FROM working_hours WHERE venue_id = $1 ORDER BY day_of_week ASC', [id]);
  const images = await pool.query('SELECT * FROM venue_images WHERE venue_id = $1', [id]);

  if (venue.rows.length === 0) throw new Error('Not found');
  
  return { 
    ...venue.rows[0], 
    working_hours: hours.rows, 
    images: images.rows 
  };
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

exports.getAllVenues = async () => {
  const result = await pool.query(
    `SELECT v.*, 
      (SELECT url FROM venue_images WHERE venue_id = v.id LIMIT 1) as main_image,
      v.avg_rating,     -- <--- DODATO
      v.review_count    -- <--- DODATO
     FROM venues v 
     WHERE v.is_active = TRUE 
     ORDER BY v.created_at DESC`
  );
  return result.rows;
};

// U services/venues.service.js

exports.getAllSports = async () => {
  try {
    const result = await pool.query('SELECT * FROM sports ORDER BY name ASC');
    return result.rows;
  } catch (err) {
    throw err;
  }
};