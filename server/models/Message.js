const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceRequest',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    senderRole: {
        type: String,
        enum: ['user', 'mechanic'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', messageSchema);
