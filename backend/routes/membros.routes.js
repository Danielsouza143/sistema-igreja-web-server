import express from 'express';
import Membro from '../models/membro.model.js';
import Lancamento from '../models/lancamento.model.js';
import { s3Upload, s3Delete, getS3KeyFromUrl } from '../utils/s3-upload.js';

import { fileURLToPath } from 'url';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();

const upload = s3Upload('membros');

// Rota para fazer upload da foto do membro
router.post('/upload-foto', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Nenhum arquivo enviado.' });
  }
  const filePath = req.file.location;
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
router.put('/:id', upload.single('foto'), async (req, res) => {
    try {
        const { fotoUrl, ...updateData } = req.body;
        const existingMembro = await Membro.findById(req.params.id);

        if (!existingMembro) {
            return res.status(404).json({ message: 'Membro não encontrado' });
        }

        if (req.file) {
            // Se uma nova foto foi enviada, exclua a antiga do S3, se existir
            if (existingMembro.fotoUrl) {
                const oldKey = getS3KeyFromUrl(existingMembro.fotoUrl);
                if (oldKey) {
                    await s3Delete(oldKey);
                }
            }
            updateData.fotoUrl = req.file.location;
        } else if (fotoUrl === null && existingMembro.fotoUrl) {
            // Se a foto foi explicitamente removida (frontend envia null)
            const oldKey = getS3KeyFromUrl(existingMembro.fotoUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
            updateData.fotoUrl = null;
        }

        const membroAtualizado = await Membro.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!membroAtualizado) return res.status(404).json({ message: 'Membro não encontrado' });
        res.json(membroAtualizado);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar membro', error });
    }
});

// DELETE /:id - Excluir um membro
router.delete('/:id', async (req, res) => {
    try {
        const membroExcluido = await Membro.findById(req.params.id);
        if (!membroExcluido) return res.status(404).json({ message: 'Membro não encontrado' });

        // Excluir a foto associada do S3, se existir
        if (membroExcluido.fotoUrl) {
            const oldKey = getS3KeyFromUrl(membroExcluido.fotoUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
        }

        await Membro.findByIdAndDelete(req.params.id);
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