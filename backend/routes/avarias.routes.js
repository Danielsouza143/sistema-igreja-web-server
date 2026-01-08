import express from 'express';
import Avaria from '../models/avaria.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protege todas as rotas
router.use(protect);

// GET / - Listar todas as avarias do tenant
router.get('/', async (req, res) => {
    try {
        const avarias = await Avaria.find({ tenantId: req.tenant.id }).populate('itemId');
        res.json(avarias);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar avarias', error: error.message });
    }
});

// POST / - Criar um novo registro de avaria
router.post('/', async (req, res) => {
    try {
        const novaAvaria = new Avaria({
            ...req.body,
            tenantId: req.tenant.id
        });
        await novaAvaria.save();
        res.status(201).json(novaAvaria);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao registrar avaria', error: error.message });
    }
});

// PUT /:id - Atualizar um registro de avaria
router.put('/:id', async (req, res) => {
    try {
        const avaria = await Avaria.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            req.body,
            { new: true }
        );
        if (!avaria) return res.status(404).json({ message: 'Registro de avaria não encontrado' });
        res.json(avaria);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar avaria', error: error.message });
    }
});

// DELETE /:id - Excluir um registro de avaria
router.delete('/:id', async (req, res) => {
    try {
        const avaria = await Avaria.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!avaria) return res.status(404).json({ message: 'Registro de avaria não encontrado' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir avaria', error: error.message });
    }
});


export default router;