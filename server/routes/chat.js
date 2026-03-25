const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const ServiceRequest = require('../models/ServiceRequest');
const { auth } = require('../middleware/auth');

// GET /api/chat/:requestId - Get message history
router.get('/chat/:requestId', auth, async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const serviceRequest = await ServiceRequest.findById(requestId);

        if (!serviceRequest) {
            return res.status(404).json({ message: 'Service request not found' });
        }

        // Only allow involved user or mechanic
        if (serviceRequest.userId.toString() !== req.user.id && 
            serviceRequest.mechanicId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this chat' });
        }

        const messages = await Message.find({ requestId })
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/chat/:requestId - Send a message
router.post('/chat/:requestId', auth, async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const serviceRequest = await ServiceRequest.findById(requestId);

        if (!serviceRequest) {
            return res.status(404).json({ message: 'Service request not found' });
        }

        // Only allow involved user or mechanic
        let role = '';
        if (serviceRequest.userId.toString() === req.user.id) {
            role = 'user';
        } else if (serviceRequest.mechanicId.toString() === req.user.id) {
            role = 'mechanic';
        } else {
            return res.status(403).json({ message: 'Not authorized to send messages here' });
        }

        const message = new Message({
            requestId,
            senderId: req.user.id,
            senderRole: role,
            content
        });

        await message.save();
        res.status(201).json(message);
    } catch (error) {
        console.error('Send chat error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
