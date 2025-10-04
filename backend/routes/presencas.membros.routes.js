import express from 'express';
import PresencaMembro from '../models/presenca.membros.model.js';

const router = express.Router();

// GET / - Listar todas as presenças salvas
router.get('/', async (req, res) => {
    try {
        const presencas = await PresencaMembro.find();
        res.json(presencas);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar presenças de membros', error: error.message });
    }
});

// POST / - Salvar presenças para uma data específica
router.post('/', async (req, res) => {
    const { data, membros } = req.body; // data no formato 'YYYY-MM-DD', membros é um array de IDs

    if (!data || !membros) {
        return res.status(400).json({ message: 'Data e lista de membros são obrigatórios.' });
    }

    try {
        // Encontra e atualiza o registro para a data, ou cria um novo se não existir
        await PresencaMembro.findOneAndUpdate({ data }, { membros }, { new: true, upsert: true });
        res.status(200).json({ message: 'Presenças de membros atualizadas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar presenças de membros', error: error.message });
    }
});

export default router;

