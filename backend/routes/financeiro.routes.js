import express from 'express';
import Lancamento from '../models/lancamento.model.js';
import { s3Upload, s3Delete, getS3KeyFromUrl, getSignedUrlForObject } from '../utils/s3-upload.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = s3Upload('comprovantes', false);

// Aplica proteção a todas as rotas financeiras
router.use(protect);

// GET /api/financeiro/lancamentos - Listar todos os lançamentos do tenant
router.get('/lancamentos', async (req, res) => {
    try {
        const lancamentos = await Lancamento.find({ tenantId: req.tenant.id }).sort({ data: -1 }).lean();
        for (let lancamento of lancamentos) {
            if (lancamento.comprovanteUrl) {
                const s3Key = getS3KeyFromUrl(lancamento.comprovanteUrl);
                if (s3Key) {
                    lancamento.comprovanteUrl = await getSignedUrlForObject(s3Key);
                }
            }
        }
        res.json(lancamentos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar lançamentos financeiros.', error: error.message });
    }
});

// POST /api/financeiro/lancamentos - Criar um novo lançamento para o tenant
router.post('/lancamentos', async (req, res) => {
    try {
        const novoLancamento = new Lancamento({
            ...req.body,
            tenantId: req.tenant.id
        });
        await novoLancamento.save();
        res.status(201).json(novoLancamento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar lançamento.', error: error.message });
    }
});

// GET /api/financeiro/lancamentos/:id - Obter um lançamento específico do tenant
router.get('/lancamentos/:id', async (req, res) => {
    try {
        const lancamento = await Lancamento.findOne({ _id: req.params.id, tenantId: req.tenant.id }).lean();
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });
        if (lancamento.comprovanteUrl) {
            const s3Key = getS3KeyFromUrl(lancamento.comprovanteUrl);
            if (s3Key) {
                lancamento.comprovanteUrl = await getSignedUrlForObject(s3Key);
            }
        }
        res.json(lancamento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar lançamento.', error: error.message });
    }
});

// PUT /api/financeiro/lancamentos/:id - Atualizar um lançamento do tenant
router.put('/lancamentos/:id', upload.single('comprovante'), async (req, res) => {
    try {
        const { comprovanteUrl, ...updateData } = req.body;
        const existingLancamento = await Lancamento.findOne({ _id: req.params.id, tenantId: req.tenant.id });

        if (!existingLancamento) {
            return res.status(404).json({ message: 'Lançamento não encontrado.' });
        }

        if (req.file) {
            if (existingLancamento.comprovanteUrl) {
                const oldKey = getS3KeyFromUrl(existingLancamento.comprovanteUrl);
                if (oldKey) await s3Delete(oldKey);
            }
            updateData.comprovanteUrl = req.file.location;
        } else if (comprovanteUrl === null && existingLancamento.comprovanteUrl) {
            const oldKey = getS3KeyFromUrl(existingLancamento.comprovanteUrl);
            if (oldKey) await s3Delete(oldKey);
            updateData.comprovanteUrl = null;
        }

        const lancamento = await Lancamento.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            updateData,
            { new: true, runValidators: true }
        );
        res.json(lancamento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar lançamento.', error: error.message });
    }
});

// DELETE /api/financeiro/lancamentos/:id - Excluir um lançamento do tenant
router.delete('/lancamentos/:id', async (req, res) => {
    try {
        const lancamento = await Lancamento.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });

        if (lancamento.comprovanteUrl) {
            const oldKey = getS3KeyFromUrl(lancamento.comprovanteUrl);
            if (oldKey) await s3Delete(oldKey);
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir lançamento.', error: error.message });
    }
});

// DELETE /api/financeiro/lancamentos/lote - Excluir múltiplos lançamentos do tenant
router.delete('/lancamentos/lote', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Nenhum ID fornecido para exclusão.' });
    }
    try {
        const lancamentosToDelete = await Lancamento.find({ _id: { $in: ids }, tenantId: req.tenant.id });
        for (const lancamento of lancamentosToDelete) {
            if (lancamento.comprovanteUrl) {
                const oldKey = getS3KeyFromUrl(lancamento.comprovanteUrl);
                if (oldKey) await s3Delete(oldKey);
            }
        }

        await Lancamento.deleteMany({ _id: { $in: ids }, tenantId: req.tenant.id });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir lançamentos em lote.', error: error.message });
    }
});

// POST /api/financeiro/upload-comprovante - Rota para upload do arquivo (já protegida pelo router.use)
router.post('/upload-comprovante', upload.single('comprovante'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    const filePath = req.file.location;
    res.status(200).json({ filePath: filePath });
});

export default router;