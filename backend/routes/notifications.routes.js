import express from 'express';
import Notification from '../models/notification.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// GET /api/notifications - Listar notificações não lidas (ou as últimas X)
router.get('/', async (req, res) => {
    try {
        const notifications = await Notification.find({ tenantId: req.tenant.id })
            .sort({ createdAt: -1 })
            .limit(50); // Limita às últimas 50
        
        const unreadCount = await Notification.countDocuments({ tenantId: req.tenant.id, read: false });
        
        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar notificações' });
    }
});

// PUT /api/notifications/read-all - Marcar todas como lidas (e limpar visualmente)
router.put('/read-all', async (req, res) => {
    try {
        // Opção 1: Apenas marcar como lida (Histórico permanece)
        // await Notification.updateMany({ tenantId: req.tenant.id, read: false }, { read: true });
        
        // Opção 2 (Solicitada): "Elimina todas" (Excluir do banco ou arquivar)
        // Vamos excluir as lidas para limpar a lista como pedido
        await Notification.deleteMany({ tenantId: req.tenant.id });
        
        res.json({ message: 'Notificações limpas.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao limpar notificações' });
    }
});

// PUT /api/notifications/:id/read - Marcar uma específica como lida (ao clicar)
router.put('/:id/read', async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            { read: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar notificação' });
    }
});

export default router;