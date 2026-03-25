const express = require('express');
const router = express.Router();
const Mechanic = require('../models/Mechanic');
const { auth, mechanicOnly } = require('../middleware/auth');
const { profileUpload } = require('../middleware/upload');

// Admin middleware simple check
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// GET /api/admin/mechanics (Admin only)
router.get('/admin/mechanics', auth, adminOnly, async (req, res) => {
    try {
        const mechanics = await Mechanic.find().select('-password').sort({ createdAt: -1 });
        res.json(mechanics);
    } catch (error) {
        console.error('Fetch all mechanics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/mechanics/:id/ban (Admin only)
router.put('/admin/mechanics/:id/ban', auth, adminOnly, async (req, res) => {
    try {
        const mechanic = await Mechanic.findById(req.params.id);
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }

        mechanic.isBanned = !mechanic.isBanned; // Toggle ban status
        await mechanic.save();

        res.json({ message: `Mechanic ${mechanic.isBanned ? 'banned' : 'unbanned'} successfully`, mechanic });
    } catch (error) {
        console.error('Ban mechanic error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/mechanics/nearby?lat=&lng=&radius=
router.get('/mechanics/nearby', async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const maxDistance = (parseFloat(radius) || 10) * 1000; // Convert km to meters

        const mechanics = await Mechanic.find({
            isBanned: { $ne: true },
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: maxDistance
                }
            }
        }).select('-password');

        // Calculate distance for each mechanic
        const mechanicsWithDistance = mechanics.map(mech => {
            const mechObj = mech.toObject();
            const distance = calculateDistance(
                latitude, longitude,
                mech.location.coordinates[1], mech.location.coordinates[0]
            );
            mechObj.distance = Math.round(distance * 10) / 10; // Round to 1 decimal
            return mechObj;
        });

        res.json(mechanicsWithDistance);
    } catch (error) {
        console.error('Nearby search error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/mechanic/update
router.put('/mechanic/update', auth, mechanicOnly, (req, res, next) => {
    profileUpload(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
}, async (req, res) => {
    try {
        const updates = {};
        const fields = ['name', 'phone', 'shopName', 'shopAddress', 'serviceArea'];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (req.body.services) {
            updates.services = req.body.services.split(',').map(s => s.trim());
        }

        if (req.body.lat && req.body.lng) {
            updates.location = {
                type: 'Point',
                coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
            };
        }

        const fileFields = ['profilePhoto', 'aadharCard', 'panCard', 'drivingLicense', 'shopImage'];
        fileFields.forEach(field => {
            if (req.files?.[field]?.[0]) {
                updates[field] = req.files[field][0].filename;
            }
        });

        const mechanic = await Mechanic.findByIdAndUpdate(
            req.user.id, updates, { new: true }
        ).select('-password');

        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic profile not found' });
        }

        res.json(mechanic);
    } catch (error) {
        console.error('Mechanic update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = router;
