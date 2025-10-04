// Arquivo: backend/models/utensilio.js
const mongoose = require('mongoose');

const utensilioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    categoria: { type: String, required: true },
    quantidade: { type: Number, required: true, min: 0 },
    localizacao: { type: String, required: true },
    estado: { type: String, required: true },
    observacoes: { type: String },
    foto: { type: String }, // Caminho para a foto
});

module.exports = mongoose.model('Utensilio', utensilioSchema);