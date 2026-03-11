const express = require('express');
const router = express.Router();
const venueController = require('../controllers/venues.controller');

// Importuj middleware-e
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
// routes/venues.routes.js
const upload = require('../config/multer');

router.post('/new', authMiddleware, roleMiddleware(['owner']), upload.array('images', 20), venueController.createVenue);


// 2. Vlasnik može da vidi samo svoje terene (takođe zaštitiš)
router.get(
  '/owner/:ownerId', 
  authMiddleware, 
  roleMiddleware(['owner', 'admin']), // Može i admin ako ga ikad dodaš
  venueController.getVenuesForOwner
);

router.get('/sports', venueController.getAllSports); // <--- DODAJ OVO
// 3. Ovo ostaje javno (svi mogu da vide terene na početnoj strani)
router.get('/all', venueController.getAllVenues);

// Brisanje terena
router.delete('/:id', authMiddleware, roleMiddleware(['owner']), venueController.deleteVenue);

// Ažuriranje terena (koristimo PUT)
router.put('/:id', authMiddleware, roleMiddleware(['owner']), upload.array('images', 20), venueController.updateVenue);

// Pomoćna ruta: Dohvatanje JEDNOG terena (treba nam za Edit formu da popuni polja)
router.get('/:id', venueController.getVenueById);


module.exports = router;