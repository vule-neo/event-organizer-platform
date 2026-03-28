const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerValidation, loginValidation, updateProfileValidation } = require('../middleware/validation.middleware');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// ... tvoje postojeće rute za login i register ...
router.put('/profile-update', authMiddleware, updateProfileValidation, authController.updateProfile);


router.get('/profile', authMiddleware, authController.getProfile);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
module.exports = router;