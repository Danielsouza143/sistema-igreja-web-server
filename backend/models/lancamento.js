// Arquivo: backend/models/lancamento.js

const mongoose = require('mongoose');

const lancamentoSchema = new mongoose.Schema({
    tipo: { type: String, required: true, enum: ['entrada', 'saida'] },
    data: { type: Date, required: true },
    valor: { type: Number, required: true },
    categoria: { type: String, required: true },
    descricao: { type: String, required: true },
    membroId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Membro', // Referencia o modelo 'Membro' que já temos
        default: null 
    },
    dataCriacao: { type: Date, default: Date.now }
});

const Lancamento = mongoose.model('Lancamento', lancamentoSchema);

module.exports = Lancamento;