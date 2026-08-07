import mongoose from 'mongoose';

const fundoSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    nome: { type: String, required: true },
    descricao: { type: String },
    meta: { type: Number, default: 0 },
    prazo: { type: Date },
    // O SEGREDO ESTÁ AQUI: O banco agora aceita os itens!
    itens: [{
        nome: { type: String, required: true },
        valor: { type: Number, required: true },
        anexoUrl: { type: String }
    }]
}, { timestamps: true });

export default mongoose.model('Fundo', fundoSchema);
