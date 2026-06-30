const { type } = require('express/lib/response');
const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String },
    profilepic: { type: String, default: "https://cdn-icons-png.flaticon.com/512/3541/3541871.png" },
    ispremium: { type: Boolean, default: false },
    subscriptionStart: { type: Date },
    subscriptionEnd: { type: Date },
    addons: { type: [String], default: [] },
    favorites: { type: Array, default: [] }
},
    {
        timestamps: true
    })

module.exports = mongoose.model("user", userSchema);
