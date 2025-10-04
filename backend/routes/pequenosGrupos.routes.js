import express from 'express';
import PequenoGrupo from '../models/pequenoGrupo.model.js';

const router = express.Router();

// GET / - Listar todos os pequenos grupos
router.get('/', async (req, res) => {
    try {
        // .populate() substitui os IDs de líder e anfitrião pelos documentos completos dos membros
        const grupos = await PequenoGrupo.find()
            .populate('lider', 'nome')
            .populate('anfitriao', 'nome')
            .populate('membros', 'nome');
        res.json(grupos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pequenos grupos', error: error.message });
    }
});

// GET /:id - Obter um pequeno grupo específico
router.get('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findById(req.params.id)
            .populate('lider', 'nome foto')
            .populate('anfitriao', 'nome')
            .populate('membros', 'nome');
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.json(grupo);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar o grupo', error: error.message });
    }
});

// POST / - Criar novo pequeno grupo
router.post('/', async (req, res) => {
    try {
        const novoGrupo = new PequenoGrupo(req.body);
        await novoGrupo.save();
        res.status(201).json(novoGrupo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar grupo', error: error.message });
    }
});

// PUT /:id - Atualizar um pequeno grupo
router.put('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.json(grupo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar grupo', error: error.message });
    }
});

// DELETE /:id - Excluir um pequeno grupo
router.delete('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findByIdAndDelete(req.params.id);
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir grupo', error: error.message });
    }
});

// POST /:id/encontros - Adicionar um novo encontro a um grupo
router.post('/:id/encontros', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findByIdAndUpdate(req.params.id, { $push: { encontros: req.body } }, { new: true });
        res.status(201).json(grupo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao registrar encontro', error: error.message });
    }
});

export default router;