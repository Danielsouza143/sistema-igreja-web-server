import express from 'express';
import PequenoGrupo from '../models/pequenoGrupo.model.js'; // CORREÇÃO: Importando o modelo ESM correto
const router = express.Router();

// GET /api/pequenos-grupos
router.get('/', async (req, res) => {
    try {
        const grupos = await PequenoGrupo.find()
            .populate('lider', 'nome')
            .populate('anfitriao', 'nome')
            .populate('membros', 'nome'); // Adicionado para contagem correta no painel
        res.json(grupos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pequenos grupos', error });
    }
});

// POST /api/pequenos-grupos
router.post('/', async (req, res) => {
    try {
        const novoGrupo = new PequenoGrupo(req.body);
        await novoGrupo.save();
        res.status(201).json(novoGrupo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar pequeno grupo', error });
    }
});

// GET /:id - Obter um pequeno grupo específico
router.get('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findById(req.params.id)
            .populate('lider', 'nome foto')
            .populate('anfitriao', 'nome')
            .populate('membros', 'nome foto'); // Popula membros para a lista detalhada
        if (!grupo) return res.status(404).json({ message: 'Grupo não encontrado' });
        res.json(grupo);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar o grupo', error: error.message });
    }
});

// PUT /:id - Atualizar um pequeno grupo
router.put('/:id', async (req, res) => {
    try {
        const grupo = await PequenoGrupo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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