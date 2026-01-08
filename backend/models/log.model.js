import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const logSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: { // Denormalizado para facilitar a exibição
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        // Ex: 'LOGIN', 'CREATE_USER', 'DELETE_MEMBER'
    },
    details: {
        type: String,
        required: true
    },
    targetId: {
        type: String // Pode ser um ObjectId ou qualquer ID
    }
}, {
    timestamps: true,
    collection: 'logs'
});

const Log = model('Log', logSchema);

export default Log;