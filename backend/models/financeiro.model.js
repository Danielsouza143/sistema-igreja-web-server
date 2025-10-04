import mongoose from 'mongoose';

const lancamentoSchema = new mongoose.Schema({
    tipo: { type: String, required: true, enum: ['entrada', 'saida'] },
    valor: { type: Number, required: true },
    descricao: { type: String, required: true },
    data: { type: Date, default: Date.now },
    categoria: { type: String },
    membroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', default: null }
}, { collection: 'lancamentos' });

export default mongoose.model('Lancamento', lancamentoSchema);