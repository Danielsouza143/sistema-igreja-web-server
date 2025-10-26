import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const lembreteSchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        required: true, 
        enum: ['event-reminder', 'loan-due', 'general'] 
    },
    read: { 
        type: Boolean, 
        default: false 
    },
    link: { 
        type: String 
    }, // ex: /pages/agenda/agenda.html?eventId=...
    relatedDoc: {
        id: { type: Schema.Types.ObjectId },
        model: { type: String } // ex: 'Evento', 'Emprestimo'
    }
}, {
    timestamps: true,
    collection: 'lembretes'
});

const Lembrete = model('Lembrete', lembreteSchema);
export default Lembrete;
