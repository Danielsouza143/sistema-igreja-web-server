import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const lancamentoSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    descricao: { type: String, required: true },
    valor: { type: Number, required: true },
    data: { type: Date, required: true },
    tipo: { type: String, enum: ['entrada', 'saida'], required: true },
    categoria: { type: String, required: true }, // Ex: Dízimo, Oferta, Despesa Administrativa
    membroId: {
        type: Schema.Types.ObjectId,
        ref: 'Membro',
        required: function() { return this.categoria === 'Dízimo'; } // Dízimo sempre tem membro
    },
    comprovanteUrl: { type: String } // Campo para armazenar o caminho do arquivo de comprovante
}, {
    timestamps: true,
    collection: 'lancamentos'
});

const Lancamento = model('Lancamento', lancamentoSchema);
export default Lancamento;