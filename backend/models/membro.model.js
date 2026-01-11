import mongoose from 'mongoose';

const filhoSchema = new mongoose.Schema({
    nome: String,
    dataNascimento: Date
});

const membroSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    nome: { type: String, required: true },
        status: {
            type: String,
            enum: ['ativo', 'inativo', 'disciplina', 'transferido', 'falecido'],
            default: 'ativo'
        },
        cardToken: {
            type: String,
            unique: true,
            sparse: true, // Permite valores nulos (para membros antigos que ainda não têm token)
            index: true
        },
        motivoInatividade: {
            type: String,
            trim: true
        },    foto: { type: String },
    cpf: { type: String },
    dataNascimento: { type: Date },
    telefone: { type: String },
    email: { type: String },
    genero: { type: String },
    endereco: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },
    rg: { type: String },
    naturalidade: { type: String },
    filiacao: { type: String },
    estadoCivil: { type: String },
    dataCasamento: { type: Date },
    dataDivorcio: { type: Date },
    dataViuvez: { type: Date },
    nomeConjuge: { type: String },
    conjugeMembro: { type: String },
    conjugeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro' },
    filhos: [filhoSchema],
    batismoAguas: { type: String },
    dataBatismo: { type: Date },
    batismoEspiritoSanto: { type: String },
    dataBatismoEspiritoSanto: { type: Date },
    dataConversao: { type: Date },
    grupoPequeno: { type: mongoose.Schema.Types.ObjectId, ref: 'PequenoGrupo' },
    outroGrupo: { type: String },
    profissao: { type: String },
    escolaridade: { type: String },
    veioDeOutraIgreja: { type: String },
    nomeOutraIgreja: { type: String },
    liderancaOutraIgreja: { type: String },
    qualLideranca: { type: String },
    cursoTeologico: { type: String },
    dons: [String],
    especificarLouvor: { type: String },
    especificarOutroDom: { type: String },
    comoConheceuIgreja: { type: String },
    restricaoSaude: { type: String },
    autorizaComunicados: { type: String },
    autorizaImagem: { type: String },
    cargoEclesiastico: { type: String },
    temMinisterio: { type: String },
    ministerio: { type: String },
    nomeOutroMinisterio: { type: String },
    cargoMinisterio: { type: String },
    eDizimista: { type: Boolean, default: false },
    dataCadastro: { type: Date, default: Date.now }
}, { strict: false }); // strict: false permite campos não definidos no schema

export default mongoose.model('Membro', membroSchema);