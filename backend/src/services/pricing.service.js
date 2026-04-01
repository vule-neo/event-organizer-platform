const pool = require('../config/db');

/**
 * Dohvati sva pravila za dati teren.
 */
exports.getVenuePricing = async (venueId) => {
    const result = await pool.query(
        `SELECT id, venue_id, day_of_week,
                start_time, end_time,
                price::float AS price, created_at
         FROM venue_pricing
         WHERE venue_id = $1
         ORDER BY day_of_week ASC, start_time ASC`,
        [venueId]
    );
    return result.rows;
};

/**
 * Zamijeni sva pricing pravila za teren unutar otvorene transakcije.
 * Briše stara pravila i ubacuje nova.
 */
exports.upsertPricingInTransaction = async (client, venueId, pricingRules) => {
    await client.query('DELETE FROM venue_pricing WHERE venue_id = $1', [venueId]);

    if (!pricingRules || pricingRules.length === 0) return;

    for (const rule of pricingRules) {
        await client.query(
            `INSERT INTO venue_pricing (venue_id, day_of_week, start_time, end_time, price)
             VALUES ($1, $2, $3, $4, $5)`,
            [venueId, rule.day_of_week, rule.start_time, rule.end_time, rule.price]
        );
    }
};

/**
 * Izračunaj cijenu za konkretan termin.
 *
 * @param {string} venueId
 * @param {string} startTimeISO  - ISO string termina (npr. "2024-06-10T10:00:00Z")
 * @returns {number} cijena u RSD
 *
 * Logika:
 *  1. Izvuci dan u sedmici i početno vrijeme iz startTimeISO (UTC).
 *  2. Traži odgovarajuće pravilo u venue_pricing.
 *  3. Ako nema pravila → vrati venues.price_per_slot kao fallback.
 */
exports.getVenuePrice = async (venueId, startTimeISO) => {
    const startDate = new Date(startTimeISO);
    const dayOfWeek = startDate.getUTCDay(); // 0=Nedjelja, 1=Ponedeljak...
    const timeStr = [
        startDate.getUTCHours().toString().padStart(2, '0'),
        startDate.getUTCMinutes().toString().padStart(2, '0')
    ].join(':');

    const priceResult = await pool.query(
        `SELECT price::float AS price
         FROM venue_pricing
         WHERE venue_id = $1
           AND day_of_week = $2
           AND start_time <= $3::time
           AND end_time   >  $3::time
         ORDER BY start_time ASC
         LIMIT 1`,
        [venueId, dayOfWeek, timeStr]
    );

    if (priceResult.rows.length > 0) {
        return priceResult.rows[0].price;
    }

    // Fallback na fiksnu cijenu terena
    const venueResult = await pool.query(
        'SELECT price_per_slot::float AS price_per_slot FROM venues WHERE id = $1',
        [venueId]
    );
    if (venueResult.rows.length === 0) throw new Error('Teren nije pronađen');
    return venueResult.rows[0].price_per_slot;
};
