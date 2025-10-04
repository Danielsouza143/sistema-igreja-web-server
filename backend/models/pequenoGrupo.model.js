import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const encontroSchema = new Schema({
    data: { type: Date, required: true },
    tema: { type: String },
    visitantes: { type: Number, default: 0 },
    presentes: [{ type: Schema.Types.ObjectId, ref: 'Membro' }]
}, {
    _id: true,
    timestamps: true
});

const pequenoGrupoSchema = new Schema({
    nome: { type: String, required: true, unique: true },
    lider: { type: Schema.Types.ObjectId, ref: 'Membro', required: true },
    anfitriao: { type: Schema.Types.ObjectId, ref: 'Membro' },
    diaSemana: { type: String, required: true },
    horario: { type: String, required: true },
    endereco: {
        cep: String,
        logradouro: String,
        bairro: String,
        cidade: String,
    },
    membros: [{
        type: Schema.Types.ObjectId,
        ref: 'Membro'
    }],
    encontros: [encontroSchema]
}, {
    timestamps: true,
    collection: 'pequenos_grupos'
});

const PequenoGrupo = model('PequenoGrupo', pequenoGrupoSchema);

export default PequenoGrupo;