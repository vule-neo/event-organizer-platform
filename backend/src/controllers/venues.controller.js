const venueService = require('../services/venues.service');
const pricingService = require('../services/pricing.service');

exports.createVenue = async (req, res) => {
  try {
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

// ---- NOVO ----
exports.getPublicStats = async (req, res) => {
  try {
    const result = await venueService.getPublicStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAvailableToday = async (req, res) => {
  try {
    const venues = await venueService.getAvailableToday();
    res.json(venues);
  } catch (err) {
    console.error('getAvailableToday error:', err);
    res.status(500).json({ message: 'Greška pri učitavanju slobodnih terena.' });
  }
};

exports.getPricing = async (req, res) => {
  try {
    const pricing = await pricingService.getVenuePricing(req.params.id);
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const rules = req.body.pricing || req.body;
    const pool = require('../config/db');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await pricingService.upsertPricingInTransaction(client, id, Array.isArray(rules) ? rules : []);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};