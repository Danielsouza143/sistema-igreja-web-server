import express from 'express';
import PresencaMembro from '../models/presenca.membros.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protege todas as rotas
router.use(protect);

// GET / - Listar todas as presenças salvas do tenant
router.get('/', async (req, res) => {
    try {
        const presencas = await PresencaMembro.find({ tenantId: req.tenant.id });
        res.json(presencas);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar presenças de membros', error: error.message });
    }
});

// POST / - Salvar presenças para uma data específica no tenant
router.post('/', async (req, res) => {
    const { data, membros } = req.body;
    const { tenantId } = req.tenant;

    if (!data || !membros) {
        return res.status(400).json({ message: 'Data e lista de membros são obrigatórios.' });
    }

    try {
        // Encontra e atualiza o registro para a data e tenant, ou cria um novo se não existir
        await PresencaMembro.findOneAndUpdate(
            { data: data, tenantId: tenantId },
            { membros: membros, tenantId: tenantId },
            { new: true, upsert: true }
        );
        res.status(200).json({ message: 'Presenças de membros atualizadas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar presenças de membros', error: error.message });
    }
});

export default router;

