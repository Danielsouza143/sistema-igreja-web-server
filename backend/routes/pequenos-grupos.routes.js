import express from 'express';
import PequenoGrupo from '../models/pequenoGrupo.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplica proteção a todas as rotas
router.use(protect);

// GET / - Listar todos os pequenos grupos do tenant
router.get('/', async (req, res) => {
    try {
        const grupos = await PequenoGrupo.find({ tenantId: req.tenant.id })
            .populate('lider', 'nome')
            .populate('anfitriao', 'nome')
            .populate('membros', 'nome');
        res.json(grupos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pequenos grupos', error });
    }
});

// POST / - Criar novo pequeno grupo para o tenant
router.post('/', async (req, res) => {
    try {
        const novoGrupo = new PequenoGrupo({
            ...req.body,
            tenantId: req.tenant.id
        });
        await novoGrupo.save();
        res.status(201).json(novoGrupo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar pequeno grupo', error });
    }
});

// GET /:id - Obter um pequeno grupo específico do tenant
router.get('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findOne({ _id: req.params.id, tenantId: req.tenant.id })
            .populate('lider', 'nome foto')
            .populate('anfitriao', 'nome')
            .populate('membros', 'nome foto');
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.json(grupo);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar o grupo', error: error.message });
    }
});

// PUT /:id - Atualizar um pequeno grupo do tenant
router.put('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.json(grupo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar grupo', error: error.message });
    }
});

// DELETE /:id - Excluir um pequeno grupo do tenant
router.delete('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir grupo', error: error.message });
    }
});

// POST /:id/encontros - Adicionar um novo encontro a um grupo do tenant
router.post('/:id/encontros', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            { $push: { encontros: req.body } },
            { new: true }
        );
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.status(201).json(grupo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao registrar encontro', error: error.message });
    }
});

export default router;