import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const lembreteSchema = new Schema({
    content: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    collection: 'lembretes'
});

const Lembrete = model('Lembrete', lembreteSchema);
export default Lembrete;