import express from 'express';
import PresencaVisitante from '../models/presenca.visitante.model.js';

const router = express.Router();

// GET /api/presencas-visitantes - Listar todas as presenças de visitantes
router.get('/', async (req, res, next) => {
    try {
        const presencas = await PresencaVisitante.find().sort({ data: -1 });
        res.json(presencas);
    } catch (error) {
        next(error);
    }
});

// POST /api/presencas-visitantes - Salvar ou atualizar presenças de um dia
router.post('/', async (req, res, next) => {
    const { data, visitantes } = req.body;

    try {
        // Usa 'upsert' para criar um novo registro se não existir, ou atualizar se já existir para a data.
        const presenca = await PresencaVisitante.findOneAndUpdate(
            { data: data },
            { visitantes: visitantes },
            { new: true, upsert: true, runValidators: true }
        );
        res.status(201).json(presenca);
    } catch (error) {
        next(error);
    }
});

export default router;