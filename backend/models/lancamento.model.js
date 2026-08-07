import mongoose from 'mongoose';

const lancamentoSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    tipo: { type: String, required: true, enum: ['entrada', 'saida'] },
    valor: { type: Number, required: true },
    descricao: { type: String, required: true },
    data: { type: Date, default: Date.now },
    categoria: { type: String },
    membroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', default: null },
    fundoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fundo', default: null },
    // AQUI ESTÁ O SEGREDO: O BANCO AGORA ACEITA VINCULAR O LANÇAMENTO AO ITEM!
    itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    comprovanteUrl: { type: String, default: null }
}, { collection: 'lancamentos', timestamps: true });

export default mongoose.model('Lancamento', lancamentoSchema);
