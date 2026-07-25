import express from 'express';
import Lancamento from '../models/lancamento.model.js';
import Fundo from '../models/fundo.model.js';
import { s3Upload, s3Delete, getS3KeyFromUrl, getSignedUrlForObject } from '../utils/s3-upload.js';
import { protect } from '../middleware/auth.middleware.js';
import { createNotification } from '../utils/notification.service.js';

const router = express.Router();
const upload = s3Upload('comprovantes', false);

// Aplica proteção a todas as rotas financeiras
router.use(protect);

// GET /api/financeiro/lancamentos - Listar lançamentos com filtros dinâmicos
router.get('/lancamentos', async (req, res) => {
    try {
        const { ano, mes, categorias } = req.query;
        let query = { tenantId: req.tenant.id };

        if (ano && ano !== 'todos') {
            const anoInt = parseInt(ano);
            let start, end;

            if (mes && mes !== 'todos') {
                const mesInt = parseInt(mes) - 1; 
                start = new Date(Date.UTC(anoInt, mesInt, 1, 0, 0, 0));
                end = new Date(Date.UTC(anoInt, mesInt + 1, 0, 23, 59, 59, 999));
            } else {
                start = new Date(Date.UTC(anoInt, 0, 1, 0, 0, 0));
                end = new Date(Date.UTC(anoInt, 11, 31, 23, 59, 59, 999));
            }
            query.data = { $gte: start, $lte: end };
        } else if (mes && mes !== 'todos') {
            const anoAtual = new Date().getUTCFullYear();
            const mesInt = parseInt(mes) - 1;
            const start = new Date(Date.UTC(anoAtual, mesInt, 1, 0, 0, 0));
            const end = new Date(Date.UTC(anoAtual, mesInt + 1, 0, 23, 59, 59, 999));
            query.data = { $gte: start, $lte: end };
        }

        if (categorias) {
            let catsArray = Array.isArray(categorias) ? categorias : categorias.split(',').map(c => c.trim()).filter(Boolean);
            if (catsArray.length > 0) {
                query.categoria = { $in: catsArray };
            }
        }

        const lancamentos = await Lancamento.find(query).sort({ data: -1 }).lean();
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

// POST /api/financeiro/lancamentos - Criar um novo lançamento
router.post('/lancamentos', async (req, res) => {
    try {
        const novoLancamento = new Lancamento({
            ...req.body,
            tenantId: req.tenant.id
        });
        await novoLancamento.save();

        await createNotification(req.tenant.id, {
            title: 'Novo Lançamento',
            message: `${novoLancamento.tipo === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${novoLancamento.valor.toFixed(2)} registrada.`,
            type: 'finance',
            link: '/pages/financeiro.page/financeiro.html'
        });

        res.status(201).json(novoLancamento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar lançamento.', error: error.message });
    }
});

// GET /api/financeiro/lancamentos/:id - Obter um lançamento específico
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

// PUT /api/financeiro/lancamentos/:id - Atualizar um lançamento
router.put('/lancamentos/:id', upload.single('comprovante'), async (req, res) => {
    try {
        const { comprovanteUrl, ...updateData } = req.body;
        const existingLancamento = await Lancamento.findOne({ _id: req.params.id, tenantId: req.tenant.id });

        if (!existingLancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });

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

// DELETE /api/financeiro/lancamentos/:id - Excluir um lançamento
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

// DELETE /api/financeiro/lancamentos/lote - Excluir múltiplos lançamentos
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

// POST /api/financeiro/upload-comprovante - Rota para upload
router.post('/upload-comprovante', upload.single('comprovante'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    const filePath = req.file.location;
    res.status(200).json({ filePath: filePath });
});


// ==========================================
// ROTAS DE FUNDOS E METAS
// ==========================================

// GET /api/financeiro/fundos - Listar fundos calculando o progresso
router.get('/fundos', async (req, res) => {
    try {
        const fundos = await Fundo.find({ tenantId: req.tenant.id }).lean();
        
        for (let fundo of fundos) {
            const lancamentos = await Lancamento.find({ fundoId: fundo._id, tenantId: req.tenant.id });
            const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
            const saidas = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
            
            fundo.arrecadado = entradas - saidas;
        }
        
        res.json(fundos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar fundos.', error: error.message });
    }
});

// POST /api/financeiro/fundos - Criar novo fundo
router.post('/fundos', async (req, res) => {
    try {
        const novoFundo = new Fundo({ ...req.body, tenantId: req.tenant.id });
        await novoFundo.save();
        res.status(201).json(novoFundo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar fundo.', error: error.message });
    }
});

// PUT /api/financeiro/fundos/:id - Editar fundo
router.put('/fundos/:id', async (req, res) => {
    try {
        const fundo = await Fundo.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            req.body,
            { new: true }
        );
        res.json(fundo);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar fundo.', error: error.message });
    }
});

// DELETE /api/financeiro/fundos/:id - Excluir fundo
router.delete('/fundos/:id', async (req, res) => {
    try {
        await Fundo.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        await Lancamento.updateMany({ fundoId: req.params.id, tenantId: req.tenant.id }, { fundoId: null });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir fundo.', error: error.message });
    }
});

export default router;
