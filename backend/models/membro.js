import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const membroSchema = new Schema({
    // Dados Pessoais
    nome: { type: String, required: true },
    foto: { type: String },
    cpf: { type: String },
    rg: { type: String },
    dataNascimento: { type: Date },
    genero: { type: String },
    naturalidade: { type: String },
    filiacao: { type: String },

    // Contato
    telefone: { type: String },
    email: { type: String },

    // Endereço
    endereco: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },

    // Família
    estadoCivil: { type: String, enum: ['solteiro', 'casado', 'divorciado', 'viuvo'] },
    dataCasamento: { type: Date },
    dataDivorcio: { type: Date },
    dataViuvez: { type: Date },
    nomeConjuge: { type: String },
    conjugeMembro: { type: String, enum: ['sim', 'nao'] },
    conjugeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', default: null },
    filhos: [{
        nome: String,
        dataNascimento: Date
    }],

    // Vida Cristã
    dataConversao: { type: Date },
    batismoAguas: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    dataBatismo: { type: Date }, // Data do batismo nas águas
    batismoEspiritoSanto: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    dataBatismoEspiritoSanto: { type: Date },
    veioDeOutraIgreja: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    nomeOutraIgreja: { type: String },
    liderancaOutraIgreja: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    qualLideranca: { type: String },
    comoConheceuIgreja: { type: String },

    // Dons e Ministérios
    cargoEclesiastico: { type: String },
    grupoPequeno: { type: mongoose.Schema.Types.ObjectId, ref: 'PequenoGrupo', default: null },
    temMinisterio: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    ministerio: { type: String },
    nomeOutroMinisterio: { type: String },
    cargoMinisterio: { type: String },
    cursoTeologico: { type: String },
    dons: [String],
    especificarLouvor: { type: String },
    especificarOutroDom: { type: String },

    // Outros
    profissao: { type: String },
    escolaridade: { type: String },
    restricaoSaude: { type: String },
    autorizaComunicados: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    autorizaImagem: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    dataCadastro: { type: Date, default: Date.now }
});

export default model('Membro', membroSchema);
