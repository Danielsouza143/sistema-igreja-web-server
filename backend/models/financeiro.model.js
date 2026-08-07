import mongoose from 'mongoose';

const lancamentoSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }, // Essencial para isolar os dados da igreja
    tipo: { type: String, required: true, enum: ['entrada', 'saida'] },
    valor: { type: Number, required: true },
    descricao: { type: String, required: true },
    data: { type: Date, default: Date.now },
    categoria: { type: String },
    membroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membro', default: null },
    
    // --- NOVOS CAMPOS PARA FUNDOS E ORÇAMENTOS ---
    fundoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fundo', default: null },
    itemId: { type: mongoose.Schema.Types.ObjectId, default: null }, // O novo campo que vincula ao item do orçamento
    
    // --- CAMPO PARA ANEXO DE COMPROVANTE ---
    comprovanteUrl: { type: String, default: null }
}, { 
    collection: 'lancamentos',
    timestamps: true // Cria automaticamente as datas de createdAt e updatedAt
});

export default mongoose.model('Lancamento', lancamentoSchema);
