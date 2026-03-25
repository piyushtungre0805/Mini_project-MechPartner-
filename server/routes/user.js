const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Mechanic = require('../models/Mechanic');
const { auth } = require('../middleware/auth');
const { profileUpload } = require('../middleware/upload');
const bcrypt = require('bcryptjs');

// GET /api/profile
router.get('/profile', auth, async (req, res) => {
    try {
        // Special case for static Admin
        if (req.user.id === 'admin123') {
            return res.json({
                _id: 'admin123',
                name: 'Administrator',
                email: 'somethingnew434@gmail.com',
                role: 'admin'
            });
        }

        let profile;
        if (req.user.role === 'mechanic') {
            profile = await Mechanic.findById(req.user.id).select('-password');
        } else {
            profile = await User.findById(req.user.id).select('-password');
        }

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Profile fetch error:', error);
        // Handle CastError (invalid IDs)
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid User ID format' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/update-profile
router.put('/update-profile', auth, (req, res, next) => {
    profileUpload(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
}, async (req, res) => {
    try {
        const updates = {};
        const fields = ['name', 'phone', 'address', 'shopName', 'shopAddress', 'serviceArea'];

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

        // Handle file uploads
        const fileFields = ['profilePhoto', 'aadharCard', 'panCard', 'drivingLicense', 'shopImage'];
        fileFields.forEach(field => {
            if (req.files?.[field]?.[0]) {
                updates[field] = req.files[field][0].filename;
            }
        });

        let profile;
        if (req.user.role === 'mechanic') {
            profile = await Mechanic.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        } else {
            profile = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
        }

        res.json(profile);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/change-password
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        let account;
        if (req.user.role === 'mechanic') {
            account = await Mechanic.findById(req.user.id);
        } else if (req.user.role === 'user') {
            account = await User.findById(req.user.id);
        }

        if (!account) {
            return res.status(404).json({ message: 'Account not found. Cannot change password.' });
        }

        const isMatch = await account.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        account.password = newPassword;
        await account.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
