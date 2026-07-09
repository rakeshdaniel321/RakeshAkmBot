const mongoose = require('mongoose');

const UserLeadSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    telegramUsername: { type: String, default: 'N/A' },
    realName: { type: String, default: 'N/A' },
    email: { type: String, default: 'N/A' },
    age: { type: Number, default: 0 },
    chosenLanguage: { type: String, default: 'EN' },
    locationFrom: { type: String, default: 'N/A' }, // User typed city
    gpsLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    deviceInfo: { type: String, default: 'N/A' },
    browserInfo: { type: String, default: 'N/A' },
    screenSize: { type: String, default: 'N/A' },
    flamesPartnerName: { type: String, default: 'N/A' },
    flamesResult: { type: String, default: 'N/A' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserLead', UserLeadSchema);