const express = require('express');
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require('path');
const pool = require('./config/db');
const cronService = require('./services/cron.service'); // Tvoj cron posao

const app = express();

// Security Middleware
app.use(helmet());

// Rate Limiting (Prevent brute force / DDOS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api/", limiter);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://event-organizer-platform-weld.vercel.app",
  "https://sportskitermin.rs",
  "https://www.sportskitermin.rs"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked"));
    }
  },
  credentials: true
}));
app.use(express.json());


// Rute
const authRoutes = require('./routes/auth.routes');
const venuesRoutes = require('./routes/venues.routes');
const bookingRoutes = require('./routes/booking.routes');
const reviewRoutes = require('./routes/review.routes'); // DODAJ I OVO ako si napravio

app.use('/api/auth', authRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes); // Registrujemo recenzije

const authMiddleware = require('./middleware/auth.middleware');

// Test rute
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'You are authorized', user: req.user });
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

const adminRoutes = require('./routes/admin.routes');
app.use('/api/admin', adminRoutes);

// POKRETANJE CRON POSLA (Automatizacija statusa)
cronService.initCron();

// AUTO-MIGRACIJA: kreira tabele koje možda nedostaju u produkcijskoj bazi
async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS venue_pricing (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time  TIME WITHOUT TIME ZONE NOT NULL,
        end_time    TIME WITHOUT TIME ZONE NOT NULL,
        price       DECIMAL(10,2) NOT NULL CHECK (price > 0),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_venue_pricing_venue_id ON venue_pricing(venue_id)
    `);
    // Ukloni check constraint koji blokira cijene/rezervacije do ponoći (00:00)
    await pool.query(`
      ALTER TABLE venue_pricing DROP CONSTRAINT IF EXISTS chk_end_after_start
    `);
    await pool.query(`
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_check
    `);
    console.log('✅ Migracije završene (venue_pricing OK)');
  } catch (err) {
    console.error('❌ Greška pri migraciji:', err.message);
  }
}

// POKRETANJE SERVERA (Samo jednom baki!)
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server radi na portu ${PORT}`);
  console.log('⏰ Automatizacija termina aktivirana...');
  await runMigrations();
});