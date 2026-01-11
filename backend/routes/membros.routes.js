import express from 'express';
import Membro from '../models/membro.model.js';
import Lancamento from '../models/lancamento.model.js';
import { s3Upload, s3Delete, getS3KeyFromUrl, getSignedUrlForObject } from '../utils/s3-upload.js';
import { protect } from '../middleware/auth.middleware.js';
import { logActivity } from '../utils/logActivity.js';
import { createNotification } from '../utils/notification.service.js'; // NOVO
import crypto from 'crypto'; // Necessário para gerar token do cartão

const router = express.Router();
const upload = s3Upload('membros'); // Restaurando a definição do upload

// Todas as rotas de membros são protegidas
router.use(protect);

// Rota para fazer upload da foto do membro
router.post('/upload-foto', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Nenhum arquivo enviado.' });
  }
  const filePath = req.file.location;
  res.status(200).json({ filePath: filePath });
});

// GET / - Listar todos os membros do tenant
router.get('/', async (req, res) => {
    try {
        const membros = await Membro.find({ tenantId: req.tenant.id }).lean();
        for (const membro of membros) {
            if (membro.foto) {
                const s3Key = getS3KeyFromUrl(membro.foto);
                if (s3Key) {
                    membro.fotoUrl = await getSignedUrlForObject(s3Key);
                } else {
                    membro.fotoUrl = membro.foto; // Fallback para URLs públicas
                }
            }
        }
        res.json(membros);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar membros' });
    }
});

// POST / - Criar novo membro para o tenant
router.post('/', async (req, res) => {
    try {
        const novoMembro = new Membro({
            ...req.body,
            tenantId: req.tenant.id
        });
        await novoMembro.save();
        await logActivity(req.user, 'CREATE_MEMBER', `Cadastrou o membro '${novoMembro.nome}'.`, novoMembro._id);
        
        // Notificação
        await createNotification(req.tenant.id, {
            title: 'Novo Membro',
            message: `${novoMembro.nome} foi cadastrado(a) com sucesso.`,
            type: 'member',
            link: `/pages/lista.membros/detalhes_membro.html?id=${novoMembro._id}`
        });

        res.status(201).json(novoMembro);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao cadastrar membro', error: error.message });
    }
});

// GET /:id - Obter um membro específico do tenant
router.get('/:id', async (req, res) => {
    try {
        let membro = await Membro.findOne({ _id: req.params.id, tenantId: req.tenant.id }).lean();
        if (!membro) return res.status(404).json({ message: 'Membro não encontrado' });

        // --- GERAÇÃO AUTOMÁTICA DE TOKEN DE CARTÃO ---
        if (!membro.cardToken) {
            console.log(`[MEMBER-CARD] Membro ${membro.nome} (ID: ${membro._id}) sem token. Gerando novo...`);
            try {
                const newToken = crypto.randomBytes(16).toString('hex');
                // Atualiza no banco
                await Membro.findByIdAndUpdate(membro._id, { cardToken: newToken });
                // Atualiza o objeto em memória para retornar agora
                membro.cardToken = newToken;
                console.log(`[MEMBER-CARD] Token gerado com sucesso: ${newToken}`);
            } catch (tokenError) {
                console.error('[MEMBER-CARD] Erro ao gerar token do cartão:', tokenError);
            }
        } else {
            // console.log(`[MEMBER-CARD] Token já existente para ${membro.nome}: ${membro.cardToken}`);
        }

        if (membro.foto) {
            const s3Key = getS3KeyFromUrl(membro.foto);
            if (s3Key) {
                membro.fotoUrl = await getSignedUrlForObject(s3Key);
            } else {
                membro.fotoUrl = membro.foto;
            }
        }
        
        res.json(membro);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar membro' });
    }
});

// PUT /:id - Atualizar um membro do tenant
router.put('/:id', upload.single('foto'), async (req, res) => {
    try {
        const { fotoUrl, ...updateData } = req.body;
        const existingMembro = await Membro.findOne({ _id: req.params.id, tenantId: req.tenant.id });

        if (!existingMembro) {
            return res.status(404).json({ message: 'Membro não encontrado' });
        }

        if (req.file) {
            if (existingMembro.fotoUrl) {
                const oldKey = getS3KeyFromUrl(existingMembro.fotoUrl);
                if (oldKey) await s3Delete(oldKey);
            }
            updateData.fotoUrl = req.file.location;
        } else if (fotoUrl === null && existingMembro.fotoUrl) {
            const oldKey = getS3KeyFromUrl(existingMembro.fotoUrl);
            if (oldKey) await s3Delete(oldKey);
            updateData.fotoUrl = null;
        }

        const membroAtualizado = await Membro.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            updateData,
            { new: true, runValidators: true }
        );
        
        res.json(membroAtualizado);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar membro', error });
    }
});

// DELETE /:id - Excluir um membro do tenant
router.delete('/:id', async (req, res) => {
    try {
        const membroExcluido = await Membro.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });

        if (!membroExcluido) return res.status(404).json({ message: 'Membro não encontrado' });

        if (membroExcluido.fotoUrl) {
            const oldKey = getS3KeyFromUrl(membroExcluido.fotoUrl);
            if (oldKey) await s3Delete(oldKey);
        }

        await logActivity(req.user, 'DELETE_MEMBER', `Excluiu o membro '${membroExcluido.nome}'.`, req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir membro', error });
    }
});

// GET /:id/contribuicoes - Obter histórico financeiro de um membro do tenant
router.get('/:id/contribuicoes', async (req, res) => {
    try {
        // Verifica primeiro se o membro pertence ao tenant
        const membro = await Membro.findOne({ _id: req.params.id, tenantId: req.tenant.id });
        if (!membro) return res.status(404).json({ message: 'Membro não encontrado' });

        const contribuicoes = await Lancamento.find({ 
            membroId: req.params.id,
            tipo: 'entrada',
            tenantId: req.tenant.id
        });
        res.json(contribuicoes);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar contribuições do membro' });
    }
});

// POST /presencas - Salvar presenças de membros para uma data no tenant
router.post('/presencas', async (req, res) => {
    const { data, membros } = req.body; // data no formato 'YYYY-MM-DD', membros é um array de IDs
    try {
        await Membro.updateMany({ _id: { $in: membros }, tenantId: req.tenant.id }, { $addToSet: { presencas: data } });
        await Membro.updateMany({ _id: { $nin: membros }, tenantId: req.tenant.id }, { $pull: { presencas: data } });

        res.status(200).json({ message: 'Presenças de membros atualizadas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar presenças', error: error.message });
    }
});

export default router;