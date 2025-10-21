import express from 'express';
import Utensilio from '../models/utensilio.model.js';
import Emprestimo from '../models/emprestimo.model.js'; // Assumindo que o modelo se chama emprestimo.model.js
import { logActivity } from '../utils/logActivity.js';
import { s3Upload, s3Delete, getS3KeyFromUrl } from '../utils/s3-upload.js';

const router = express.Router();

// --- Configuração do Multer para upload de arquivos de utensílios (agora para S3) ---
const upload = s3Upload('utensilios');

// GET /api/utensilios - Listar todos os utensílios
router.get('/', async (req, res, next) => {
    try {
        const utensilios = await Utensilio.find().sort({ nome: 1 });
        res.json(utensilios);
    } catch (error) {
        next(error);
    }
});

// --- ADICIONADO: Rota para o inventário (sinônimo de GET /) ---
// GET /api/utensilios/inventario - Listar todos os utensílios no inventário
router.get('/inventario', async (req, res, next) => {
    try {
        const utensilios = await Utensilio.find().sort({ nome: 1 });
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
        const emprestimos = await Emprestimo.find().populate('utensilioId').populate('membroId').sort({ dataEmprestimo: -1 });
        res.json(emprestimos);
    } catch (error) {
        next(error);
    }
});

// GET /api/utensilios/manutencao - Listar todos os utensílios com status "Em Manutenção"
router.get('/manutencao', async (req, res, next) => {
    try {
        const itensEmManutencao = await Utensilio.find({ status: 'Em Manutenção' }).sort({ nome: 1 });
        res.json(itensEmManutencao);
    } catch (error) {
        next(error);
    }
});


// POST /api/utensilios - Criar novo utensílio
router.post('/', upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'notaFiscal', maxCount: 1 }]), async (req, res, next) => {
    try {
        const dados = { ...req.body };

        // Adiciona os caminhos dos arquivos ao objeto de dados, se existirem
        if (req.files && req.files.foto) {
            dados.fotoUrl = req.files.foto[0].location;
        }
        if (req.files && req.files.notaFiscal) {
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
router.put('/:id', upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'notaFiscal', maxCount: 1 }]), async (req, res, next) => {
    try {
        const dados = { ...req.body };
        const existingUtensilio = await Utensilio.findById(req.params.id);

        if (!existingUtensilio) {
            return res.status(404).json({ message: 'Utensílio não encontrado' });
        }

        // Lidar com upload de nova foto e exclusão da antiga
        if (req.files && req.files.foto) {
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
        if (req.files && req.files.notaFiscal) {
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