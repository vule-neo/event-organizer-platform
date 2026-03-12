const venueService = require('../services/venues.service');

exports.createVenue = async (req, res) => {
  try {
    // Multer popunjava req.body i req.files
    // Šaljemo oba servisu da bi on mogao da uradi transakciju
    const result = await venueService.createVenue(req.body, req.files);
    
    res.status(201).json(result);
  } catch (err) {
    console.error('Greška u kontroleru (createVenue):', err);
    res.status(400).json({ message: err.message });
  }
};

exports.getVenuesForOwner = async (req, res) => {
  try {
    const { ownerId } = req.params; 
    const result = await venueService.getVenuesForOwner(ownerId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllVenues = async (req, res) => {
  try {
    const result = await venueService.getAllVenues();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await venueService.deleteVenue(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getVenueById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await venueService.getVenueById(id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ message: 'Teren nije pronađen' });
  }
};

exports.updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    // req.body su tekstualna polja, req.files su nove slike ako ih ima
    const result = await venueService.updateVenue(id, req.body, req.files);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAllSports = async (req, res) => {
  try {
    const result = await venueService.getAllSports();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const result = await venueService.toggleVenueActive(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllTags = async (req, res) => {
  try {
    const tags = await venueService.getAllTags();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};