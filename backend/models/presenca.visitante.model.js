import mongoose from 'mongoose';

const presencaVisitanteSchema = new mongoose.Schema({
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