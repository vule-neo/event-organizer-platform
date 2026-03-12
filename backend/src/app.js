const express = require('express');
const cors = require("cors");
const path = require('path');
const pool = require('./config/db');
const cronService = require('./services/cron.service'); // Tvoj cron posao

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:4200",
  credentials: true
}));
app.use(express.json());

// Serviranje statičkih fajlova (slike terena)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

// POKRETANJE SERVERA (Samo jednom baki!)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server radi na portu ${PORT}`);
  console.log('⏰ Automatizacija termina aktivirana...');
});