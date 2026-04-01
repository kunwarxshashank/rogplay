const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    email: { type: String, required: true },
    paymentId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: "pending" },
    subscriptionStart: { type: Date, default: 0 },
    subscriptionEnd: { type: Date, default: 0 }
})

module.exports = mongoose.model("payment", paymentSchema);
