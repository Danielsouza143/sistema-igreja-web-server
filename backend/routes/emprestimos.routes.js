import express from 'express';
import Emprestimo from '../models/emprestimo.model.js';
import Utensilio from '../models/utensilio.model.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();

// POST /api/emprestimos - Criar um novo empréstimo
router.post('/', async (req, res, next) => {
    const { utensilioId, membroId, dataDevolucaoPrevista, quantidade } = req.body;

    try {
        // 1. Cria o registro de empréstimo
        const novoEmprestimo = new Emprestimo({
            utensilioId,
            membroId,
            quantidade,
            dataDevolucaoPrevista,
            dataEmprestimo: new Date(),
            status: 'Emprestado'
        });
        await novoEmprestimo.save();

        // 2. Atualiza o status do utensílio para "Emprestado"
        await Utensilio.findByIdAndUpdate(utensilioId, { status: 'Emprestado' });

        res.status(201).json(novoEmprestimo);
    } catch (error) {
        next(error);
    }
});

export default router;