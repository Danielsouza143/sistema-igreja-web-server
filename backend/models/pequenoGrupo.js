const mongoose = require('mongoose');

const encontroSchema = new mongoose.Schema({
    data: { type: Date, required: true },
    presentes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membro' }],
    visitantes: { type: Number, default: 0 },
    tema: { type: String }
});

const pequenoGrupoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    lider: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', required: true },
    anfitriao: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
    membros: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membro' }],
    diaSemana: { type: String, required: true, enum: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'] },
    horario: { type: String, required: true },
    endereco: {
        cep: String,
        logradouro: String,
        bairro: String,
        cidade: String
    },
    metas: {
        evangelismo: { type: Number, default: 0 },
        multiplicacao: { type: Boolean, default: false }
    },
    encontros: [encontroSchema]
}, { timestamps: true });

module.exports = mongoose.models.PequenoGrupo || mongoose.model('PequenoGrupo', pequenoGrupoSchema);