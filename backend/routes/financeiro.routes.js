import express from 'express';
import Lancamento from '../models/lancamento.model.js';
import { s3Upload, s3Delete, getS3KeyFromUrl } from '../utils/s3-upload.js';

const router = express.Router();

// --- Configuração do Multer para upload de comprovantes (agora para S3) ---
const upload = s3Upload('comprovantes');

// GET /api/financeiro/lancamentos - Listar todos os lançamentos
router.get('/lancamentos', async (req, res) => {
    try {
        // Ordena por data, dos mais recentes para os mais antigos
        const lancamentos = await Lancamento.find().sort({ data: -1 });
        res.json(lancamentos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar lançamentos financeiros.', error: error.message });
    }
});

// POST /api/financeiro/lancamentos - Criar um novo lançamento
router.post('/lancamentos', async (req, res) => {
    try {
        const novoLancamento = new Lancamento(req.body);
        await novoLancamento.save();
        res.status(201).json(novoLancamento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar lançamento.', error: error.message });
    }
});

// GET /api/financeiro/lancamentos/:id - Obter um lançamento específico
router.get('/lancamentos/:id', async (req, res) => {
    try {
        const lancamento = await Lancamento.findById(req.params.id);
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });
        res.json(lancamento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar lançamento.', error: error.message });
    }
});

// PUT /api/financeiro/lancamentos/:id - Atualizar um lançamento
router.put('/lancamentos/:id', upload.single('comprovante'), async (req, res) => {
    try {
        const { comprovanteUrl, ...updateData } = req.body;
        const existingLancamento = await Lancamento.findById(req.params.id);

        if (!existingLancamento) {
            return res.status(404).json({ message: 'Lançamento não encontrado.' });
        }

        // Se um novo comprovante foi enviado
        if (req.file) {
            // Excluir o comprovante antigo do S3, se existir
            if (existingLancamento.comprovanteUrl) {
                const oldKey = getS3KeyFromUrl(existingLancamento.comprovanteUrl);
                if (oldKey) {
                    await s3Delete(oldKey);
                }
            }
            updateData.comprovanteUrl = req.file.location;
        } else if (comprovanteUrl === null && existingLancamento.comprovanteUrl) {
            // Se o comprovante foi explicitamente removido (frontend envia null)
            const oldKey = getS3KeyFromUrl(existingLancamento.comprovanteUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
            updateData.comprovanteUrl = null;
        }

        const lancamento = await Lancamento.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });
        res.json(lancamento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar lançamento.', error: error.message });
    }
});

// DELETE /api/financeiro/lancamentos/:id - Excluir um lançamento
router.delete('/lancamentos/:id', async (req, res) => {
    try {
        const lancamento = await Lancamento.findById(req.params.id);
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });

        // Excluir o comprovante associado do S3, se existir
        if (lancamento.comprovanteUrl) {
            const oldKey = getS3KeyFromUrl(lancamento.comprovanteUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
        }

        await Lancamento.findByIdAndDelete(req.params.id);
        res.status(204).send(); // 204 No Content
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir lançamento.', error: error.message });
    }
});

// DELETE /api/financeiro/lancamentos/lote - Excluir múltiplos lançamentos
router.delete('/lancamentos/lote', async (req, res) => {
    const { ids } = req.body; // Espera um array de IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Nenhum ID fornecido para exclusão.' });
    }
    try {
        // Buscar lançamentos para excluir comprovantes do S3
        const lancamentosToDelete = await Lancamento.find({ _id: { $in: ids } });
        for (const lancamento of lancamentosToDelete) {
            if (lancamento.comprovanteUrl) {
                const oldKey = getS3KeyFromUrl(lancamento.comprovanteUrl);
                if (oldKey) {
                    await s3Delete(oldKey);
                }
            }
        }

        await Lancamento.deleteMany({ _id: { $in: ids } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir lançamentos em lote.', error: error.message });
    }
});

// POST /api/financeiro/upload-comprovante - Rota para upload do arquivo
router.post('/upload-comprovante', upload.single('comprovante'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    const filePath = req.file.location;
    res.status(200).json({ filePath: filePath });
});

export default router;