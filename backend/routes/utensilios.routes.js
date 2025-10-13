import express from 'express';
import Utensilio from '../models/utensilio.model.js';
import Emprestimo from '../models/emprestimo.model.js'; // Assumindo que o modelo se chama emprestimo.model.js
import { logActivity } from '../utils/logActivity.js';
import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// --- Configuração do Multer para upload de arquivos de utensílios ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'production' 
    ? '/app/uploads/utensilios' 
    : path.resolve(__dirname, '..', '..', 'uploads', 'utensilios');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage: storage });

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
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8080}`;

        // Adiciona os caminhos dos arquivos ao objeto de dados, se existirem
        if (req.files && req.files.foto) {
            dados.fotoUrl = `${backendUrl}/uploads/utensilios/${req.files.foto[0].filename}`;
        }
        if (req.files && req.files.notaFiscal) {
            dados.notaFiscalUrl = `${backendUrl}/uploads/utensilios/${req.files.notaFiscal[0].filename}`;
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
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8080}`;

        if (req.files && req.files.foto) {
            dados.fotoUrl = `${backendUrl}/uploads/utensilios/${req.files.foto[0].filename}`;
        }
        if (req.files && req.files.notaFiscal) {
            dados.notaFiscalUrl = `${backendUrl}/uploads/utensilios/${req.files.notaFiscal[0].filename}`;
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
        const utensilio = await Utensilio.findByIdAndDelete(req.params.id);
        if (!utensilio) return res.status(404).json({ message: 'Utensílio não encontrado' });
        await logActivity(req.user, 'DELETE_UTENSILIO', `Utensílio '${utensilio.nome}' foi excluído.`);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;