const adminService = require('../services/admin.service');

exports.getStats = async (req, res) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleUserActive = async (req, res) => {
  try {
    const result = await adminService.toggleUserActive(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllVenues = async (req, res) => {
  try {
    const venues = await adminService.getAllVenues();
    res.json(venues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVenue = async (req, res) => {
  try {
    const result = await adminService.deleteVenue(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleVenueActive = async (req, res) => {
  try {
    const result = await adminService.toggleVenueActive(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};