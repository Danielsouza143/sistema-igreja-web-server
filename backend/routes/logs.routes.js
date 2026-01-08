import express from 'express';
import Log from '../models/log.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protege a rota de logs
router.use(protect);

// GET / - Listar todos os logs do tenant, dos mais recentes para os mais antigos
router.get('/', async (req, res) => {
    try {
        const logs = await Log.find({ tenantId: req.tenant.id })
            .sort({ createdAt: -1 })
            .limit(200);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar logs de atividade', error });
    }
});

export default router;