import mongoose from 'mongoose';

const emprestimoSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    utensilioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utensilio', required: true },
    membroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', required: true },
    quantidade: { type: Number, required: true, min: 1 },
    dataEmprestimo: { type: Date, default: Date.now },
    dataDevolucaoPrevista: { type: Date, required: true },
    dataDevolucaoReal: { type: Date },
    status: { type: String, enum: ['Emprestado', 'Devolvido', 'Atrasado'], default: 'Emprestado' },
    observacoes: { type: String }
}, { timestamps: true, collection: 'emprestimos' });

const Emprestimo = mongoose.model('Emprestimo', emprestimoSchema);

export default Emprestimo;