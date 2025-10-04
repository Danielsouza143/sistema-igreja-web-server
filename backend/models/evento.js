// Arquivo: backend/models/evento.js

import mongoose from 'mongoose';

const transacaoSchema = new mongoose.Schema({
    descricao: String,
    valor: Number,
    data: Date
});

const tarefaSchema = new mongoose.Schema({
    descricao: String,
    responsavelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
    prazo: Date,
    concluida: { type: Boolean, default: false }
});

const eventoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    categoria: { type: String, required: true },
    dataInicio: { type: Date, required: true },
    dataFim: { type: Date, required: true },
    local: { type: String, required: true },
    responsavelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', required: true },
    descricao: { type: String, default: '' },
    financeiro: {
        envolveFundos: { type: Boolean, default: false },
        meta: { type: Number, default: 0 },
        custoEstimado: { type: Number, default: 0 },
        entradas: [transacaoSchema],
        saidas: [transacaoSchema]
    },
    tarefas: [tarefaSchema]
});

export default mongoose.model('Evento', eventoSchema);