import Notification from '../models/notification.model.js';

export const createNotification = async (tenantId, { title, message, type = 'system', link = '#' }) => {
    try {
        if (!tenantId) return;

        const notification = new Notification({
            tenantId,
            title,
            message,
            type,
            link,
            read: false
        });

        await notification.save();
        // Aqui poderia entrar uma integração com Socket.io para Real-time no futuro
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
    }
};