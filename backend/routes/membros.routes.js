import express from 'express';
import Membro from '../models/membro.model.js';
import Lancamento from '../models/lancamento.model.js';
import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'production'
? '/app/uploads/membros'
: path.resolve(__dirname, '..', '..', 'uploads', 'membros');
// Garante que o diretório de uploads exista. Se não, ele será criado.
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Diretório de uploads criado em: ${uploadDir}`);
}

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Salva os arquivos no diretório correto
  },
  filename: function (req, file, cb) {
    // Cria um nome de arquivo único para evitar conflitos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Rota para fazer upload da foto do membro
router.post('/upload-foto', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Nenhum arquivo enviado.' });
  }
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8080}`;
  const filePath = `${backendUrl}/uploads/membros/${req.file.filename}`;
  res.status(200).json({ filePath: filePath });
});

// GET / - Listar todos os membros
router.get('/', async (req, res) => {
    try {
        const membros = await Membro.find();
        res.json(membros);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar membros' });
    }
});

// POST / - Criar novo membro
router.post('/', async (req, res) => {
    try {
        const novoMembro = new Membro(req.body);
        await novoMembro.save();
        await logActivity(req.user, 'CREATE_MEMBER', `Cadastrou o membro '${novoMembro.nome}'.`, novoMembro._id);
        res.status(201).json(novoMembro);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao cadastrar membro', error: error.message });
    }
});

// GET /:id - Obter um membro específico
router.get('/:id', async (req, res) => {
    try {
        const membro = await Membro.findById(req.params.id);
        if (!membro) return res.status(404).json({ message: 'Membro não encontrado' });
        res.json(membro);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar membro' });
    }
});

// PUT /:id - Atualizar um membro
router.put('/:id', async (req, res) => {
    try {
        const membroAtualizado = await Membro.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!membroAtualizado) return res.status(404).json({ message: 'Membro não encontrado' });
        res.json(membroAtualizado);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar membro', error });
    }
});

// DELETE /:id - Excluir um membro
router.delete('/:id', async (req, res) => {
    try {
        const membroExcluido = await Membro.findByIdAndDelete(req.params.id);
        if (!membroExcluido) return res.status(404).json({ message: 'Membro não encontrado' });
        await logActivity(req.user, 'DELETE_MEMBER', `Excluiu o membro '${membroExcluido.nome}'.`, req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir membro', error });
    }
});

// GET /:id/contribuicoes - Obter histórico financeiro de um membro
router.get('/:id/contribuicoes', async (req, res) => {
    try {
        const contribuicoes = await Lancamento.find({ 
            membroId: req.params.id,
            tipo: 'entrada' 
        });
        res.json(contribuicoes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar contribuições do membro' });
    }
});

// POST /presencas - Salvar presenças de membros para uma data
router.post('/presencas', async (req, res) => {
    const { data, membros } = req.body; // data no formato 'YYYY-MM-DD', membros é um array de IDs
    try {
        // Adiciona a data de presença para os membros selecionados
        await Membro.updateMany({ _id: { $in: membros } }, { $addToSet: { presencas: data } });
        // Remove a data de presença dos membros que não foram selecionados (caso de desmarcar)
        await Membro.updateMany({ _id: { $nin: membros } }, { $pull: { presencas: data } });

        res.status(200).json({ message: 'Presenças de membros atualizadas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar presenças', error: error.message });
    }
});

export default router;