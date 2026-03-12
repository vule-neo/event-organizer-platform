const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const adminOnly = [authMiddleware, roleMiddleware(['admin'])];

router.get('/stats', ...adminOnly, adminController.getStats);
router.get('/users', ...adminOnly, adminController.getAllUsers);
router.patch('/users/:id/toggle-active', ...adminOnly, adminController.toggleUserActive);
router.get('/venues', ...adminOnly, adminController.getAllVenues);
router.patch('/venues/:id/toggle-active', ...adminOnly, adminController.toggleVenueActive);
router.delete('/venues/:id', ...adminOnly, adminController.deleteVenue);

module.exports = router;