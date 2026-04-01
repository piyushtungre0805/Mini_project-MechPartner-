const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    issue: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'completed', 'cancelled', 'rejected'],
        default: 'pending'
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
    },
    rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic' }],
    createdAt: { type: Date, default: Date.now }
});

serviceRequestSchema.index({ location: '2dsphere' });


module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
