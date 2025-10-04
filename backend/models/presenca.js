const mongoose = require('mongoose');

const presencaSchema = new mongoose.Schema({
    data: { 
        type: String, // Usar String no formato 'YYYY-MM-DD' para simplicidade
        required: true, 
        unique: true // Garante um único registro de presença por dia
    },
    visitantes: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Visitante' 
    }]
});

module.exports = mongoose.models.Presenca || mongoose.model('Presenca', presencaSchema);