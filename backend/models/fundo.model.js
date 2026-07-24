import mongoose from 'mongoose';

const fundoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String },
    meta: { type: Number, required: true },
    prazo: { type: Date, required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }
}, { collection: 'fundos', timestamps: true });

export default mongoose.model('Fundo', fundoSchema);
