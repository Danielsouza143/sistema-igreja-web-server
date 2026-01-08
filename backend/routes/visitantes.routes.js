import express from 'express';
import Visitante from '../models/visitante.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protege todas as rotas
router.use(protect);

// GET / - Listar todos os visitantes do tenant
router.get('/', async (req, res) => {
    try {
        const visitantes = await Visitante.find({ tenantId: req.tenant.id }).sort({ nome: 1 });
        res.json(visitantes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar visitantes', error: error.message });
    }
});

// POST / - Criar novo visitante para o tenant
router.post('/', async (req, res) => {
    try {
        const novoVisitante = new Visitante({
            ...req.body,
            tenantId: req.tenant.id
        });
        await novoVisitante.save();
        res.status(201).json(novoVisitante);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao cadastrar visitante', error: error.message });
    }
});

// PUT /:id - Atualizar um visitante do tenant
router.put('/:id', async (req, res) => {
    try {
        const visitante = await Visitante.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!visitante) return res.status(404).json({ message: 'Visitante não encontrado' });
        res.json(visitante);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar visitante', error: error.message });
    }
});

// DELETE /:id - Excluir um visitante do tenant
router.delete('/:id', async (req, res) => {
    try {
        const visitante = await Visitante.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!visitante) return res.status(404).json({ message: 'Visitante não encontrado' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir visitante', error: error.message });
    }
});

// POST /presencas - Salvar presenças de visitantes para uma data no tenant
router.post('/presencas', async (req, res) => {
    const { data, visitantes } = req.body;
    try {
        // Apenas atualiza os visitantes que pertencem a este tenant
        await Visitante.updateMany(
            { _id: { $in: visitantes }, tenantId: req.tenant.id },
            { $addToSet: { presencas: { data } } }
        );
        await Visitante.updateMany(
            { _id: { $nin: visitantes }, tenantId: req.tenant.id },
            { $pull: { presencas: { data } } }
        );

        res.status(200).json({ message: 'Presenças de visitantes atualizadas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar presenças de visitantes', error: error.message });
    }
});

export default router;