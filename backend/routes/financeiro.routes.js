import express from 'express';
import Lancamento from '../models/lancamento.model.js';
import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// --- Configuração do Multer para upload de comprovantes ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'production'
    ? '/app/uploads/comprovantes'
    : path.resolve(__dirname, '..', '..', 'uploads', 'comprovantes');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'comprovante-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

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
router.put('/lancamentos/:id', async (req, res) => {
    try {
        const lancamento = await Lancamento.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });
        res.json(lancamento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar lançamento.', error: error.message });
    }
});

// DELETE /api/financeiro/lancamentos/:id - Excluir um lançamento
router.delete('/lancamentos/:id', async (req, res) => {
    try {
        const lancamento = await Lancamento.findByIdAndDelete(req.params.id);
        if (!lancamento) return res.status(404).json({ message: 'Lançamento não encontrado.' });
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
    const filePath = `/uploads/comprovantes/${req.file.filename}`;
    res.status(200).json({ filePath: filePath });
});

export default router;