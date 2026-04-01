const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mechanicSchema = new mongoose.Schema({
    name: { type: String, required: true },
    shopName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    shopAddress: { type: String, default: '' },
    serviceArea: { type: String, default: '' },
    aadharCard: { type: String, default: '' },
    panCard: { type: String, default: '' },
    drivingLicense: { type: String, default: '' },
    shopImage: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    services: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    },
    role: { type: String, default: 'mechanic' },
    isBanned: { type: Boolean, default: false },

    // Identity Verification
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'unverified'],
        default: 'pending'
    },
    verificationData: {
        aadhaarName: { type: String, default: '' },
        aadhaarDob:  { type: String, default: '' },
        licenseName: { type: String, default: '' },
        licenseDob:  { type: String, default: '' },
        panNumber:   { type: String, default: '' },
        mismatchReason: { type: String, default: '' }
    },

    createdAt: { type: Date, default: Date.now }
});

mechanicSchema.index({ location: '2dsphere' });

mechanicSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

mechanicSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Mechanic', mechanicSchema);
