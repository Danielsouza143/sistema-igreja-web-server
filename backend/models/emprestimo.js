// Arquivo: backend/models/emprestimo.js

const mongoose = require('mongoose');

const emprestimoSchema = new mongoose.Schema({
    codigo: { type: String, required: true, unique: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utensilio', required: true },
    quantidade: { type: Number, required: true },
    responsavelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', required: true },
    responsavelNome: { type: String, required: true },
    dataEmprestimo: { type: Date, default: Date.now },
    dataDevolucaoPrevista: { type: Date, required: true },
    dataDevolucaoReal: { type: Date },
    status: { type: String, required: true, enum: ['Emprestado', 'Devolvido'], default: 'Emprestado' },
    // --- ADICIONE ESTA LINHA ---
    observacoes: { type: String, default: '' }
});

module.exports = mongoose.model('Emprestimo', emprestimoSchema);