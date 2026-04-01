const reviewService = require('../services/review.service');

exports.create = async (req, res) => {
    try {
        const reviewData = {
            ...req.body,
            client_id: req.user.id
        };
        const result = await reviewService.createReview(reviewData);
        res.status(201).json(result);
    } catch (err) {
        // Handle unique violation (ako je već ocenio)
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Već ste ostavili recenziju za ovaj termin.' });
        }
        res.status(400).json({ message: err.message });
    }
};

exports.getByVenue = async (req, res) => {
    try {
        const reviews = await reviewService.getVenueReviews(req.params.venueId);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const result = await reviewService.updateReview(req.params.id, req.user.id, { rating, comment });
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        await reviewService.deleteReview(req.params.id, req.user.id);
        res.json({ message: 'Recenzija je obrisana.' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};