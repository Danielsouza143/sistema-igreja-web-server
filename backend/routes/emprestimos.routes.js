import express from 'express';
import Emprestimo from '../models/emprestimo.model.js';
import Utensilio from '../models/utensilio.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protege todas as rotas de empréstimos
router.use(protect);

// GET / - Listar todos os empréstimos do tenant
router.get('/', async (req, res) => {
    try {
        const emprestimos = await Emprestimo.find({ tenantId: req.tenant.id })
            .populate('utensilioId', 'nome')
            .populate('membroId', 'nome');
        res.json(emprestimos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar empréstimos', error: error.message });
    }
});

// POST / - Criar novo empréstimo
router.post('/', async (req, res) => {
    try {
        const { utensilioId, quantidade } = req.body;
        
        // Garante que o utensílio pertence ao tenant antes de emprestar
        const utensilio = await Utensilio.findOne({ _id: utensilioId, tenantId: req.tenant.id });
        if (!utensilio) {
            return res.status(404).json({ message: 'Utensílio não encontrado neste tenant.' });
        }
        
        const novoEmprestimo = new Emprestimo({
            ...req.body,
            tenantId: req.tenant.id,
            status: 'Emprestado',
            dataEmprestimo: new Date()
        });
        await novoEmprestimo.save();

        utensilio.status = 'Emprestado';
        await utensilio.save();

        res.status(201).json(novoEmprestimo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar empréstimo', error: error.message });
    }
});

// PUT /:id/devolver - Marcar um empréstimo como devolvido
router.put('/:id/devolver', async (req, res) => {
    try {
        const emprestimo = await Emprestimo.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            { 
                status: 'Devolvido', 
                dataDevolucaoReal: new Date(),
                ...req.body // permite adicionar observações na devolução
            },
            { new: true }
        );

        if (!emprestimo) {
            return res.status(404).json({ message: 'Empréstimo não encontrado.' });
        }

        // Atualiza o status do utensílio de volta para "Disponível"
        await Utensilio.findOneAndUpdate(
            { _id: emprestimo.utensilioId, tenantId: req.tenant.id },
            { status: 'Disponível' }
        );

        res.json(emprestimo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao registrar devolução', error: error.message });
    }
});

// DELETE /:id - Excluir um registro de empréstimo (ação administrativa)
router.delete('/:id', async (req, res) => {
    try {
        const emprestimo = await Emprestimo.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!emprestimo) {
            return res.status(404).json({ message: 'Empréstimo não encontrado' });
        }
        // Opcional: Reverter o status do utensílio se o empréstimo for cancelado/excluído
        if (emprestimo.status === 'Emprestado') {
             await Utensilio.findOneAndUpdate(
                { _id: emprestimo.utensilioId, tenantId: req.tenant.id },
                { status: 'Disponível' }
            );
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir empréstimo', error: error.message });
    }
});

export default router;