import express from 'express';
import Log from '../models/log.model.js';

const router = express.Router();

// GET / - Listar todos os logs, dos mais recentes para os mais antigos
router.get('/', async (req, res) => {
    try {
        const logs = await Log.find().sort({ createdAt: -1 }).limit(200); // Limita aos 200 mais recentes
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar logs de atividade', error });
    }
});

export default router;