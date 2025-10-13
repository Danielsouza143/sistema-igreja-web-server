import express from 'express';
import Evento from '../models/evento.js';
import Config from '../models/config.js'; // Importar o modelo de Config
import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

console.log('--- DEBUG: O arquivo eventos.routes.js foi carregado pelo servidor. ---');

const router = express.Router();

// --- Configuração do Multer para upload de cartazes ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'production' 
    ? '/app/uploads/eventos' 
    : path.resolve(__dirname, '..', '..', 'uploads', 'eventos');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cartaz-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /api/eventos/configs - Rota para buscar configurações de eventos (categorias, etc.)
router.get('/configs', async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json({
            eventos_categorias: config ? config.eventos_categorias : []
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar configurações de eventos', error });
    }
});

// GET /api/eventos - Listar todos os eventos
router.get('/', async (req, res) => {
    try {
        const eventos = await Evento.find().sort({ dataInicio: -1 });
        res.json(eventos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar eventos', error });
    }
});

// POST /api/eventos - Criar um novo evento (com upload de cartaz)
router.post('/', upload.single('cartaz'), async (req, res) => {
    try {
        const eventoData = { ...req.body };
        if (req.file) {
            eventoData.cartazUrl = `/uploads/eventos/${req.file.filename}`;
        }
        // Lógica para converter dados financeiros que chegam como string
        if (eventoData.financeiro) {
            eventoData.financeiro = JSON.parse(eventoData.financeiro);
            // CORREÇÃO: FormData envia booleans como string, converter de volta
            if (typeof eventoData.financeiro.envolveFundos === 'string') {
                eventoData.financeiro.envolveFundos = eventoData.financeiro.envolveFundos === 'true';
            }
        }

        const novoEvento = new Evento(eventoData);
        await novoEvento.save();
        res.status(201).json(novoEvento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar evento', error: error.message });
    }
});

// PUT /api/eventos/:id - Atualizar um evento (com upload de cartaz)
router.put('/:id', upload.single('cartaz'), async (req, res) => {
    try {
        const eventoData = { ...req.body };
        if (req.file) {
            eventoData.cartazUrl = `/uploads/eventos/${req.file.filename}`;
        }
        // Lógica para converter dados financeiros que chegam como string
        if (eventoData.financeiro) {
            eventoData.financeiro = JSON.parse(eventoData.financeiro);
            // CORREÇÃO: FormData envia booleans como string, converter de volta
            if (typeof eventoData.financeiro.envolveFundos === 'string') {
                eventoData.financeiro.envolveFundos = eventoData.financeiro.envolveFundos === 'true';
            }
        }

        const eventoAtualizado = await Evento.findByIdAndUpdate(req.params.id, eventoData, { new: true });
        if (!eventoAtualizado) return res.status(404).json({ message: 'Evento não encontrado' });
        res.json(eventoAtualizado);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar evento', error: error.message });
    }
});

// --- ROTAS DE SUB-DOCUMENTOS (TAREFAS E TRANSAÇÕES) ---

// POST /api/eventos/:id/tarefas - Adicionar uma nova tarefa
router.post('/:id/tarefas', async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ message: 'Evento não encontrado' });

        evento.tarefas.push(req.body);
        await evento.save();
        res.status(201).json(evento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao adicionar tarefa', error });
    }
});

// PUT /api/eventos/:id/tarefas/:tarefaId - Atualizar uma tarefa (ex: marcar como concluída)
router.put('/:id/tarefas/:tarefaId', async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ message: 'Evento não encontrado' });

        const tarefa = evento.tarefas.id(req.params.tarefaId);
        if (!tarefa) return res.status(404).json({ message: 'Tarefa não encontrada' });

        tarefa.set(req.body);
        await evento.save();
        res.json(evento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar tarefa', error });
    }
});

// DELETE /api/eventos/:id/tarefas/:tarefaId - Excluir uma tarefa
router.delete('/:id/tarefas/:tarefaId', async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ message: 'Evento não encontrado' });

        evento.tarefas.id(req.params.tarefaId).remove();
        await evento.save();
        res.json(evento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir tarefa', error });
    }
});

// POST /api/eventos/:id/transacoes - Adicionar uma nova transação financeira
router.post('/:id/transacoes', async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ message: 'Evento não encontrado' });

        const { tipo, ...dadosTransacao } = req.body;
        if (tipo === 'entradas' || tipo === 'saidas') {
            evento.financeiro[tipo].push(dadosTransacao);
        } else {
            return res.status(400).json({ message: 'Tipo de transação inválido' });
        }

        await evento.save();
        res.status(201).json(evento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao adicionar transação', error });
    }
});

// TODO: Implementar DELETE para transações se for necessário

export default router;