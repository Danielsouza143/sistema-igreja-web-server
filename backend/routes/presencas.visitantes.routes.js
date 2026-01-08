import express from 'express';
import PresencaVisitante from '../models/presenca.visitante.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

// GET /api/presencas-visitantes - Listar todas as presenças de visitantes do tenant
router.get('/', async (req, res, next) => {
    try {
        const presencas = await PresencaVisitante.find({ tenantId: req.tenant.id }).sort({ data: -1 });
        res.json(presencas);
    } catch (error) {
        next(error);
    }
});

// POST /api/presencas-visitantes - Salvar ou atualizar presenças de um dia no tenant
router.post('/', async (req, res, next) => {
    const { data, visitantes } = req.body;
    const { tenantId } = req.tenant;

    try {
        const presenca = await PresencaVisitante.findOneAndUpdate(
            { data: data, tenantId: tenantId },
            { visitantes: visitantes, tenantId: tenantId },
            { new: true, upsert: true, runValidators: true }
        );
        res.status(201).json(presenca);
    } catch (error) {
        next(error);
    }
});

export default router;