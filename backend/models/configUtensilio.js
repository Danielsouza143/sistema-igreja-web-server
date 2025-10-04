// Arquivo: backend/models/configUtensilio.js
const mongoose = require('mongoose');

const configUtensilioSchema = new mongoose.Schema({
    categorias: { type: [String], default: ["Eletrônicos", "Mobiliário", "Cozinha", "Decoração"] },
    localizacoes: { type: [String], default: ["Salão Principal", "Cozinha", "Depósito"] },
    categorias: {
        type: [String],
        default: ['Eletrônicos', 'Cozinha', 'Decoração', 'Limpeza']
    },
    localizacoes: {
        type: [{ nome: String, proprietario: String }],
        default: [{ nome: 'Sede da Igreja', proprietario: 'Igreja' }]
    },
    proximoCodigoEmprestimo: { type: Number, default: 1 }
});

module.exports = mongoose.model('ConfigUtensilio', configUtensilioSchema);
module.exports = mongoose.models.ConfigUtensilio || mongoose.model('ConfigUtensilio', configUtensilioSchema);