import mongoose from 'mongoose';

const presencaVisitanteSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    data: { type: String, required: true, unique: true }, // Formato 'YYYY-MM-DD'
    visitantes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visitante'
    }]
}, {
    timestamps: true
});

const PresencaVisitante = mongoose.model('PresencaVisitante', presencaVisitanteSchema);
export default PresencaVisitante;