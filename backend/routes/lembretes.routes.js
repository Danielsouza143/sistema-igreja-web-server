import express from 'express';
import Lembrete from '../models/lembrete.model.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();

// GET / - Listar todos os lembretes ativos
router.get('/', async (req, res) => {
    try {
        const lembretes = await Lembrete.find().sort({ createdAt: -1 });
        res.json(lembretes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar lembretes', error });
    }
});

// POST / - Criar um novo lembrete
router.post('/', async (req, res) => {
    try {
        const { content } = req.body;
        const novoLembrete = new Lembrete({ content, createdBy: req.user.id });
        await novoLembrete.save();
        await logActivity(req.user, 'CREATE_LEMBRETE', `Criou o lembrete: "${content.substring(0, 30)}..."`);
        res.status(201).json(novoLembrete);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar lembrete', error });
    }
});

// DELETE /:id - Excluir um lembrete
router.delete('/:id', async (req, res) => {
    try {
        const lembrete = await Lembrete.findByIdAndDelete(req.params.id);
        if (!lembrete) return res.status(404).json({ message: 'Lembrete não encontrado' });
        await logActivity(req.user, 'DELETE_LEMBRETE', `Excluiu o lembrete: "${lembrete.content.substring(0, 30)}..."`, lembrete._id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir lembrete', error });
    }
});

export default router;