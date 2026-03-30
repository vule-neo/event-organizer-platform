const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venues.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const upload = require('../config/cloudinary'); // umjesto multer

router.get('/available-today', venueController.getAvailableToday);
router.post('/new', authMiddleware, roleMiddleware(['owner']), upload.array('images', 5), venueController.createVenue);
router.get('/owner/:ownerId', authMiddleware, roleMiddleware(['owner', 'admin']), venueController.getVenuesForOwner);
router.patch('/:id/toggle-active', authMiddleware, roleMiddleware(['owner']), venueController.toggleActive);
router.get('/sports', venueController.getAllSports);
router.get('/tags', venueController.getAllTags);
router.get('/all', venueController.getAllVenues);
router.get('/stats', venueController.getPublicStats); // NOVO — mora prije /:id
router.delete('/:id', authMiddleware, roleMiddleware(['owner']), venueController.deleteVenue);
router.put('/:id', authMiddleware, roleMiddleware(['owner']), upload.array('images', 5), venueController.updateVenue);
router.get('/:id', venueController.getVenueById);

module.exports = router;