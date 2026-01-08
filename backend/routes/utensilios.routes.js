import express from 'express';
import Utensilio from '../models/utensilio.model.js';
import Emprestimo from '../models/emprestimo.model.js';
import { logActivity } from '../utils/logActivity.js';
import { s3Upload, s3Delete, getS3KeyFromUrl, getSignedUrlForObject } from '../utils/s3-upload.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

const uploadPublic = s3Upload('utensilios', true);
const uploadPrivate = s3Upload('utensilios', false);

const uploadFields = (req, res, next) => {
    uploadPublic.fields([{ name: 'foto', maxCount: 1 }])(req, res, (err) => {
        if (err) return next(err);
        uploadPrivate.fields([{ name: 'notaFiscal', maxCount: 1 }])(req, res, next);
    });
};

// Protege todas as rotas de utensílios
router.use(protect);

// GET /api/utensilios - Listar todos os utensílios do tenant
router.get('/', async (req, res, next) => {
    try {
        const utensilios = await Utensilio.find({ tenantId: req.tenant.id }).sort({ nome: 1 }).lean();
        for (let utensilio of utensilios) {
            if (utensilio.notaFiscalUrl) {
                const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
                if (s3Key) utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
            }
        }
        res.json(utensilios);
    } catch (error) {
        next(error);
    }
});

// GET /api/utensilios/inventario - Listar inventário do tenant
router.get('/inventario', async (req, res, next) => {
    try {
        const utensilios = await Utensilio.find({ tenantId: req.tenant.id }).sort({ nome: 1 }).lean();
        for (let utensilio of utensilios) {
            if (utensilio.notaFiscalUrl) {
                const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
                if (s3Key) utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
            }
        }
        res.json(utensilios);
    } catch (error) {
        next(error);
    }
});

// GET /api/utensilios/emprestimos - Listar todos os empréstimos do tenant
router.get('/emprestimos', async (req, res, next) => {
    try {
        const emprestimos = await Emprestimo.find({ tenantId: req.tenant.id }).populate('utensilioId').populate('membroId').sort({ dataEmprestimo: -1 }).lean();
        res.json(emprestimos);
    } catch (error) {
        next(error);
    }
});

// GET /api/utensilios/manutencao - Listar itens em manutenção do tenant
router.get('/manutencao', async (req, res, next) => {
    try {
        const itensEmManutencao = await Utensilio.find({ tenantId: req.tenant.id, status: 'Em Manutenção' }).sort({ nome: 1 }).lean();
        for (let utensilio of itensEmManutencao) {
            if (utensilio.notaFiscalUrl) {
                const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
                if (s3Key) utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
            }
        }
        res.json(itensEmManutencao);
    } catch (error) {
        next(error);
    }
});

// GET /api/utensilios/:id - Obter um utensílio específico do tenant
router.get('/:id', async (req, res, next) => {
    try {
        const utensilio = await Utensilio.findOne({ _id: req.params.id, tenantId: req.tenant.id }).lean();
        if (!utensilio) return res.status(404).json({ message: 'Utensílio não encontrado' });

        if (utensilio.notaFiscalUrl) {
            const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
            if (s3Key) utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
        }
        res.json(utensilio);
    } catch (error) {
        next(error);
    }
});

// POST /api/utensilios - Criar novo utensílio para o tenant
router.post('/', uploadFields, async (req, res, next) => {
    try {
        const dados = { ...req.body, tenantId: req.tenant.id };
        if (req.files?.foto?.[0]) dados.fotoUrl = req.files.foto[0].location;
        if (req.files?.notaFiscal?.[0]) dados.notaFiscalUrl = req.files.notaFiscal[0].location;

        const novoUtensilio = new Utensilio(dados);
        await novoUtensilio.save();
        await logActivity(req.user, 'CREATE_UTENSILIO', `Utensílio '${novoUtensilio.nome}' foi criado.`);
        res.status(201).json(novoUtensilio);
    } catch (error) {
        next(error);
    }
});

// PUT /api/utensilios/:id - Atualizar um utensílio do tenant
router.put('/:id', uploadFields, async (req, res, next) => {
    try {
        const dados = { ...req.body };
        const existingUtensilio = await Utensilio.findOne({ _id: req.params.id, tenantId: req.tenant.id });
        if (!existingUtensilio) return res.status(404).json({ message: 'Utensílio não encontrado' });

        if (req.files?.foto?.[0]) {
            if (existingUtensilio.fotoUrl) {
                const oldKey = getS3KeyFromUrl(existingUtensilio.fotoUrl);
                if (oldKey) await s3Delete(oldKey);
            }
            dados.fotoUrl = req.files.foto[0].location;
        } else if (dados.fotoUrl === null && existingUtensilio.fotoUrl) {
            const oldKey = getS3KeyFromUrl(existingUtensilio.fotoUrl);
            if (oldKey) await s3Delete(oldKey);
            dados.fotoUrl = null;
        }

        if (req.files?.notaFiscal?.[0]) {
            if (existingUtensilio.notaFiscalUrl) {
                const oldKey = getS3KeyFromUrl(existingUtensilio.notaFiscalUrl);
                if (oldKey) await s3Delete(oldKey);
            }
            dados.notaFiscalUrl = req.files.notaFiscal[0].location;
        } else if (dados.notaFiscalUrl === null && existingUtensilio.notaFiscalUrl) {
            const oldKey = getS3KeyFromUrl(existingUtensilio.notaFiscalUrl);
            if (oldKey) await s3Delete(oldKey);
            dados.notaFiscalUrl = null;
        }

        const utensilio = await Utensilio.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant.id }, dados, { new: true, runValidators: true });
        await logActivity(req.user, 'UPDATE_UTENSILIO', `Utensílio '${utensilio.nome}' foi atualizado.`);
        res.json(utensilio);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/utensilios/:id - Excluir um utensílio do tenant
router.delete('/:id', async (req, res, next) => {
    try {
        const utensilio = await Utensilio.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!utensilio) return res.status(404).json({ message: 'Utensílio não encontrado' });

        if (utensilio.fotoUrl) {
            const oldKey = getS3KeyFromUrl(utensilio.fotoUrl);
            if (oldKey) await s3Delete(oldKey);
        }
        if (utensilio.notaFiscalUrl) {
            const oldKey = getS3KeyFromUrl(utensilio.notaFiscalUrl);
            if (oldKey) await s3Delete(oldKey);
        }
        
        await logActivity(req.user, 'DELETE_UTENSILIO', `Utensílio '${utensilio.nome}' foi excluído.`);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;