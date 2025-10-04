import mongoose from 'mongoose';

const utensilioSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true },
    categoria: { type: String, required: true },
    quantidade: { type: Number, required: true, min: 0, default: 1 },
    status: {
        type: String,
        required: true,
        enum: ['Disponível', 'Emprestado', 'Em Manutenção'],
        default: 'Disponível'
    },
    // --- NOVOS CAMPOS ---
    fotoUrl: { type: String, default: '' },
    dataCompra: { type: Date },
    valor: { type: Number, default: 0 },
    notaFiscalUrl: { type: String, default: '' },
    numeroSerie: { type: String, trim: true, default: '' },
    observacoesManutencao: { type: String, default: '' },
    dataManutencao: { type: Date },
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Index para otimizar buscas por nome e status
utensilioSchema.index({ nome: 'text' });
utensilioSchema.index({ status: 1 });

const Utensilio = mongoose.model('Utensilio', utensilioSchema);

export default Utensilio;