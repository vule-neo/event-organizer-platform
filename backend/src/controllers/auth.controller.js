const authService = require('../services/auth.service');

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: err.message });
  }
};


exports.updateProfile = async (req, res) => {
    try {
        // req.user.id dolazi iz authMiddleware-a
        const updatedUser = await authService.updateUserProfile(req.user.id, req.body);
        
        res.json({
            message: 'Profil uspešno ažuriran',
            user: updatedUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Greška pri ažuriranju profila' });
    }
};


exports.getProfile = async (req, res) => {
    try {
        // req.user.id dobijamo iz authMiddleware-a
        const user = await authService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Korisnik nije pronađen' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'Ako nalog postoji, poslan je email sa uputstvima.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Greška pri slanju emaila.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    res.json({ message: 'Lozinka uspješno promijenjena.' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};