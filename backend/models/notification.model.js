import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['member', 'finance', 'event', 'inventory', 'system'],
        default: 'system'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String }, // URL para redirecionamento
    read: { type: Boolean, default: false }, // Status de leitura
    createdAt: { type: Date, default: Date.now, expires: '30d' } // Auto-remove após 30 dias para não lotar o banco
});

export default mongoose.model('Notification', notificationSchema);