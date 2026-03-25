const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    issue: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
