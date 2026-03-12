const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Javno dostupno da bi korisnik video šta je zauzeto pre logina
router.get('/occupied', bookingController.getOccupied);

// Samo za ulogovane korisnike
router.post('/create', authMiddleware, bookingController.create);
router.get('/my-reservations', authMiddleware, bookingController.getMyBookings);
router.post('/create-recurring', authMiddleware, bookingController.createRecurring);
router.patch('/:id/cancel', authMiddleware, bookingController.cancel);
// Dodajemo roleGuard da budemo sigurni da samo vlasnici pristupaju
const roleGuard = require('../middleware/role.middleware'); // Proveri putanju do tvog roleGuarda

router.get('/owner-report', authMiddleware, roleGuard(['owner']), bookingController.getForOwner);

router.post('/block', authMiddleware, roleGuard(['owner']), bookingController.block);
router.get('/:id/details', authMiddleware, bookingController.getDetails);

router.patch('/:id/owner-cancel', authMiddleware, roleGuard(['owner']), bookingController.cancelByOwner);

module.exports = router;