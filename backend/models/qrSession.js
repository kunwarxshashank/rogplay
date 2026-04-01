const mongoose = require('mongoose');

const qrSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'scanned', 'completed', 'expired'], default: 'pending' },
    token: { type: String },
    user: { type: Object },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

module.exports = mongoose.model('QRSession', qrSessionSchema);
