import mongoose from 'mongoose';

const visitanteSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    telefone: { type: String },
    dataNascimento: { type: Date },
    genero: { type: String, enum: ['masculino', 'feminino'] },
    bairro: { type: String },
    evangelico: { type: String, enum: ['sim', 'nao'] },
    comoConheceu: { type: String },
    dataPrimeiraVisita: { type: Date, default: Date.now },
    presencas: [{
        data: { type: String }, // Formato YYYY-MM-DD
        cultoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Culto' } // Opcional, para ligar a um evento/culto específico
    }]
}, {
    timestamps: true,
    collection: 'visitantes'
});

// Index para otimizar buscas por nome
visitanteSchema.index({ nome: 'text' });

// Adiciona um campo virtual para calcular a idade, se necessário no futuro
visitanteSchema.virtual('idade').get(function() {
    if (!this.dataNascimento) return null;
    return new Date().getFullYear() - new Date(this.dataNascimento).getFullYear();
});

const Visitante = mongoose.model('Visitante', visitanteSchema);
export default Visitante;