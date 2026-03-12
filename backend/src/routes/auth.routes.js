const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);

const authMiddleware = require('../middleware/auth.middleware');

// ... tvoje postojeće rute za login i register ...
router.put('/profile-update', authMiddleware, authController.updateProfile);


router.get('/profile', authMiddleware, authController.getProfile);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
module.exports = router;