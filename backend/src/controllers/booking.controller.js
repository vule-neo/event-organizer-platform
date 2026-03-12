const bookingService = require('../services/booking.service');

exports.getOccupied = async (req, res) => {
    try {
        const { venueId, date } = req.query;
        const occupied = await bookingService.getOccupiedSlots(venueId, date);
        res.json(occupied);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        // client_id vadimo iz authMiddleware-a (req.user.id)
        const bookingData = {
            ...req.body,
            client_id: req.user.id 
        };
        const result = await bookingService.createBooking(bookingData);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};


exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await bookingService.getUserBookings(req.user.id);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.cancel = async (req, res) => {
    try {
        const result = await bookingService.cancelBooking(req.params.id, req.user.id);
        res.json({ message: 'Termin uspešno otkazan', booking: result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};


exports.getForOwner = async (req, res) => {
    try {
        // req.user.id dolazi iz tokena, a roleGuard je već proverio da li je owner
        const bookings = await bookingService.getOwnerBookings(req.user.id);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.block = async (req, res) => {
    try {
        // Ovde bi bilo dobro proveriti da li je user stvarno vlasnik tog venue_id-a
        const result = await bookingService.blockSlot(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.getDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await bookingService.getBookingDetails(id);

        if (!booking) {
            return res.status(404).json({ message: 'Rezervacija nije pronađena.' });
        }

        // Sigurnosna provera: Samo klijent koji je rezervisao ili vlasnik terena mogu da vide detalje
        if (booking.client_id !== req.user.id && booking.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Nemate pristup ovim detaljima.' });
        }

        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.cancelByOwner = async (req, res) => {
    try {
        const result = await bookingService.cancelByOwner(req.params.id, req.user.id);
        res.json({ 
            message: 'Termin uspešno otkazan od strane vlasnika. Klijent će biti obavešten.', 
            booking: result 
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.createRecurring = async (req, res) => {
    try {
        const data = {
            ...req.body,
            client_id: req.user.id
        };
        const result = await bookingService.createRecurring(data);

        let message = `Uspješno rezervisano ${result.created} termina.`;
        if (result.failed.length > 0) {
            message += ` Sljedeći datumi su bili zauzeti: ${result.failed.join(', ')}`;
        }

        res.status(201).json({ message, ...result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};