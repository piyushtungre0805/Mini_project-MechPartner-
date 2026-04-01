const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const Mechanic = require('../models/Mechanic');
const User = require('../models/User');
const { auth, mechanicOnly, userOnly } = require('../middleware/auth');

// POST /api/request-service
router.post('/request-service', auth, userOnly, async (req, res) => {
    try {
        const { mechanicId, issue, lat, lng } = req.body;

        if (!mechanicId || !issue || lat === undefined || lng === undefined) {
            return res.status(400).json({ message: 'Mechanic ID, issue description, lat, and lng are required' });
        }

        const mechanic = await Mechanic.findById(mechanicId);
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }

        const serviceRequest = new ServiceRequest({
            userId: req.user.id,
            mechanicId,
            issue,
            location: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            }
        });

        await serviceRequest.save();
        res.status(201).json(serviceRequest);
    } catch (error) {
        console.error('Service request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/user/services
router.get('/user/services', auth, userOnly, async (req, res) => {
    try {
        const services = await ServiceRequest.find({ userId: req.user.id })
            .populate('mechanicId', 'name shopName phone')
            .sort({ createdAt: -1 });

        res.json(services);
    } catch (error) {
        console.error('Service history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/mechanic/requests
router.get('/mechanic/requests', auth, mechanicOnly, async (req, res) => {
    try {
        const requests = await ServiceRequest.find({ mechanicId: req.user.id })
            .populate('userId', 'name phone email address')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error('Mechanic requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/service/:id/status
router.put('/service/:id/status', auth, mechanicOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['accepted', 'completed', 'cancelled', 'rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        let serviceRequest = await ServiceRequest.findOne({ _id: req.params.id, mechanicId: req.user.id });

        if (!serviceRequest) {
            return res.status(404).json({ message: 'Service request not found' });
        }

        if (status === 'rejected') {
            serviceRequest.rejectedBy.push(req.user.id);
            serviceRequest.status = 'rejected';
        } else {
            // Normal status update
            serviceRequest.status = status;
        }

        await serviceRequest.save();
        serviceRequest = await ServiceRequest.findById(serviceRequest._id).populate('userId', 'name phone email address');

        res.json(serviceRequest);
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
