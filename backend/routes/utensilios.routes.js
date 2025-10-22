import express from 'express';
import Utensilio from '../models/utensilio.model.js';
import Emprestimo from '../models/emprestimo.model.js'; // Assumindo que o modelo se chama emprestimo.model.js
import { logActivity } from '../utils/logActivity.js';
import { s3Upload, s3Delete, getS3KeyFromUrl, getSignedUrlForObject } from '../utils/s3-upload.js';

const router = express.Router();

// --- Configuração do Multer para upload de arquivos de utensílios (agora para S3) ---
const uploadPublic = s3Upload('utensilios', true); // Para fotos (públicas)
const uploadPrivate = s3Upload('utensilios', false); // Para notas fiscais (privadas)

// Middleware para lidar com uploads de múltiplos campos com diferentes configurações de privacidade
const uploadFields = (req, res, next) => {
    const publicUpload = uploadPublic.fields([{ name: 'foto', maxCount: 1 }]);
    const privateUpload = uploadPrivate.fields([{ name: 'notaFiscal', maxCount: 1 }]);

    publicUpload(req, res, (err) => {
        if (err) return next(err);
        privateUpload(req, res, next);
    });
};

// GET /api/utensilios - Listar todos os utensílios
router.get('/', async (req, res, next) => {
    try {
        const utensilios = await Utensilio.find().sort({ nome: 1 }).lean();

        for (let utensilio of utensilios) {
            if (utensilio.notaFiscalUrl) {
                const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
                if (s3Key) {
                    utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
                }
            }
        }
        res.json(utensilios);
    } catch (error) {
        next(error);
    }
});

// --- ADICIONADO: Rota para o inventário (sinônimo de GET /) ---
// GET /api/utensilios/inventario - Listar todos os utensílios no inventário
router.get('/inventario', async (req, res, next) => {
    try {
        const utensilios = await Utensilio.find().sort({ nome: 1 }).lean();
        for (let utensilio of utensilios) {
            if (utensilio.notaFiscalUrl) {
                const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
                if (s3Key) {
                    utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
                }
            }
        }
        res.json(utensilios);
    } catch (error) {
        next(error);
    }
});

// --- ADICIONADO: Rota para os empréstimos ---
// GET /api/utensilios/emprestimos - Listar todos os empréstimos
router.get('/emprestimos', async (req, res, next) => {
    try {
        // Popula os dados do utensílio e do membro para exibir os nomes na tabela
        const emprestimos = await Emprestimo.find().populate('utensilioId').populate('membroId').sort({ dataEmprestimo: -1 }).lean();
        for (let emprestimo of emprestimos) {
            if (emprestimo.utensilioId && emprestimo.utensilioId.notaFiscalUrl) {
                const s3Key = getS3KeyFromUrl(emprestimo.utensilioId.notaFiscalUrl);
                if (s3Key) {
                    emprestimo.utensilioId.notaFiscalUrl = await getSignedUrlForObject(s3Key);
                }
            }
        }
        res.json(emprestimos);
    } catch (error) {
        next(error);
    }
});

// GET /api/utensilios/manutencao - Listar todos os utensílios com status "Em Manutenção"
router.get('/manutencao', async (req, res, next) => {
    try {
        const itensEmManutencao = await Utensilio.find({ status: 'Em Manutenção' }).sort({ nome: 1 }).lean();
        for (let utensilio of itensEmManutencao) {
            if (utensilio.notaFiscalUrl) {
                const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
                if (s3Key) {
                    utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
                }
            }
        }
        res.json(itensEmManutencao);
    } catch (error) {
        next(error);
    }
});

// GET /api/utensilios/:id - Obter um utensílio específico
router.get('/:id', async (req, res, next) => {
    try {
        const utensilio = await Utensilio.findById(req.params.id).lean();
        if (!utensilio) return res.status(404).json({ message: 'Utensílio não encontrado' });

        if (utensilio.notaFiscalUrl) {
            const s3Key = getS3KeyFromUrl(utensilio.notaFiscalUrl);
            if (s3Key) {
                utensilio.notaFiscalUrl = await getSignedUrlForObject(s3Key);
            }
        }
        res.json(utensilio);
    } catch (error) {
        next(error);
    }
});

// POST /api/utensilios - Criar novo utensílio
router.post('/', uploadFields, async (req, res, next) => {
    try {
        const dados = { ...req.body };

        // Adiciona os caminhos dos arquivos ao objeto de dados, se existirem
        if (req.files && req.files.foto && req.files.foto[0]) {
            dados.fotoUrl = req.files.foto[0].location;
        }
        if (req.files && req.files.notaFiscal && req.files.notaFiscal[0]) {
            dados.notaFiscalUrl = req.files.notaFiscal[0].location;
        }

        const novoUtensilio = new Utensilio(dados);
        await novoUtensilio.save();
        await logActivity(req.user, 'CREATE_UTENSILIO', `Utensílio '${novoUtensilio.nome}' foi criado.`);
        res.status(201).json(novoUtensilio);
    } catch (error) {
        next(error);
    }
});

// PUT /api/utensilios/:id - Atualizar um utensílio
router.put('/:id', uploadFields, async (req, res, next) => {
    try {
        const dados = { ...req.body };
        const existingUtensilio = await Utensilio.findById(req.params.id);

        if (!existingUtensilio) {
            return res.status(404).json({ message: 'Utensílio não encontrado' });
        }

        // Lidar com upload de nova foto e exclusão da antiga
        if (req.files && req.files.foto && req.files.foto[0]) {
            if (existingUtensilio.fotoUrl) {
                const oldKey = getS3KeyFromUrl(existingUtensilio.fotoUrl);
                if (oldKey) {
                    await s3Delete(oldKey);
                }
            }
            dados.fotoUrl = req.files.foto[0].location;
        } else if (dados.fotoUrl === null && existingUtensilio.fotoUrl) {
            // Se a foto foi explicitamente removida (frontend envia null)
            const oldKey = getS3KeyFromUrl(existingUtensilio.fotoUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
            dados.fotoUrl = null;
        }

        // Lidar com upload de nova nota fiscal e exclusão da antiga
        if (req.files && req.files.notaFiscal && req.files.notaFiscal[0]) {
            if (existingUtensilio.notaFiscalUrl) {
                const oldKey = getS3KeyFromUrl(existingUtensilio.notaFiscalUrl);
                if (oldKey) {
                    await s3Delete(oldKey);
                }
            }
            dados.notaFiscalUrl = req.files.notaFiscal[0].location;
        } else if (dados.notaFiscalUrl === null && existingUtensilio.notaFiscalUrl) {
            // Se a nota fiscal foi explicitamente removida (frontend envia null)
            const oldKey = getS3KeyFromUrl(existingUtensilio.notaFiscalUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
            dados.notaFiscalUrl = null;
        }

        const utensilio = await Utensilio.findByIdAndUpdate(req.params.id, dados, { new: true, runValidators: true });
        if (!utensilio) return res.status(404).json({ message: 'Utensílio não encontrado' });
        await logActivity(req.user, 'UPDATE_UTENSILIO', `Utensílio '${utensilio.nome}' foi atualizado.`);
        res.json(utensilio);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/utensilios/:id - Excluir um utensílio
router.delete('/:id', async (req, res, next) => {
    try {
        const utensilio = await Utensilio.findById(req.params.id);
        if (!utensilio) return res.status(404).json({ message: 'Utensílio não encontrado' });

        // Excluir foto e nota fiscal associadas do S3, se existirem
        if (utensilio.fotoUrl) {
            const oldKey = getS3KeyFromUrl(utensilio.fotoUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
        }
        if (utensilio.notaFiscalUrl) {
            const oldKey = getS3KeyFromUrl(utensilio.notaFiscalUrl);
            if (oldKey) {
                await s3Delete(oldKey);
            }
        }

        await Utensilio.findByIdAndDelete(req.params.id);
        await logActivity(req.user, 'DELETE_UTENSILIO', `Utensílio '${utensilio.nome}' foi excluído.`);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;