// Arquivo: backend/models/avaria.js
const mongoose = require('mongoose');

const avariaSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utensilio', required: true },
    data: { type: Date, required: true },
    descricao: { type: String, required: true },
    status: { type: String, required: true, default: 'Aberto' },
});

module.exports = mongoose.model('Avaria', avariaSchema);