import mongoose from 'mongoose';

const avariaSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utensilio', required: true },
    data: { type: Date, required: true },
    descricao: { type: String, required: true },
    status: { type: String, required: true, default: 'Aberto' },
});

export default mongoose.model('Avaria', avariaSchema);