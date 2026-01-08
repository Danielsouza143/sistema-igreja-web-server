import mongoose from 'mongoose';

const presencaMembroSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    data: {
        type: String, // Formato YYYY-MM-DD
        required: true,
    },
    membros: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membro'
    }]
});

export default mongoose.model('PresencaMembro', presencaMembroSchema);

