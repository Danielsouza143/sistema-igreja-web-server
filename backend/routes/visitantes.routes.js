import express from 'express';
import Visitante from '../models/visitante.model.js';

const router = express.Router();

// GET / - Listar todos os visitantes
router.get('/', async (req, res) => {
    try {
        const visitantes = await Visitante.find().sort({ nome: 1 });
        res.json(visitantes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar visitantes', error: error.message });
    }
});

// POST / - Criar novo visitante
router.post('/', async (req, res) => {
    try {
        const novoVisitante = new Visitante(req.body);
        await novoVisitante.save();
        res.status(201).json(novoVisitante);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao cadastrar visitante', error: error.message });
    }
});

// PUT /:id - Atualizar um visitante
router.put('/:id', async (req, res) => {
    try {
        const visitante = await Visitante.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!visitante) return res.status(404).json({ message: 'Visitante não encontrado' });
        res.json(visitante);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar visitante', error: error.message });
    }
});

// DELETE /:id - Excluir um visitante
router.delete('/:id', async (req, res) => {
    try {
        const visitante = await Visitante.findByIdAndDelete(req.params.id);
        if (!visitante) return res.status(404).json({ message: 'Visitante não encontrado' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir visitante', error: error.message });
    }
});

// POST /presencas - Salvar presenças de visitantes para uma data
router.post('/presencas', async (req, res) => {
    const { data, visitantes } = req.body; // data no formato 'YYYY-MM-DD', visitantes é um array de IDs
    try {
        // Atualiza todos os visitantes que estão na lista de presentes, adicionando a data
        await Visitante.updateMany({ _id: { $in: visitantes } }, { $addToSet: { presencas: { data } } });
        // Atualiza todos os visitantes que NÃO estão na lista, removendo a data (caso tenha sido marcada e depois desmarcada)
        await Visitante.updateMany({ _id: { $nin: visitantes } }, { $pull: { presencas: { data } } });

        res.status(200).json({ message: 'Presenças de visitantes atualizadas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar presenças de visitantes', error: error.message });
    }
});

export default router;