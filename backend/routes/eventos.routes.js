import express from 'express';
import Evento from '../models/evento.js';
import Config from '../models/config.js';
import { s3Upload, s3Delete, getS3KeyFromUrl } from '../utils/s3-upload.js';
import { protect } from '../middleware/auth.middleware.js';

console.log('--- DEBUG: O arquivo eventos.routes.js foi carregado pelo servidor. ---');

const router = express.Router();
const upload = s3Upload('eventos');

// Aplica o middleware de proteção a todas as rotas neste arquivo
router.use(protect);

// GET /api/eventos/configs - Rota para buscar configurações GLOBAIS de eventos (categorias)
router.get('/configs', async (req, res) => {
    try {
        const config = await Config.findOne({ singleton: 'main' });
        res.json({
            eventos_categorias: config ? config.eventos_categorias : []
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar configurações de eventos', error });
    }
});

// GET /api/eventos - Listar todos os eventos do tenant
router.get('/', async (req, res) => {
    try {
        const eventos = await Evento.find({ tenantId: req.tenant.id }).sort({ dataInicio: -1 });
        res.json(eventos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar eventos', error });
    }
});

// POST /api/eventos - Criar um novo evento para o tenant
router.post('/', upload.single('cartaz'), async (req, res) => {
    try {
        const eventoData = { ...req.body, tenantId: req.tenant.id };

        if (req.file) {
            eventoData.cartazUrl = req.file.location;
        }

        if (req.body.financeiro) {
            const parsedFinanceiro = JSON.parse(req.body.financeiro);
            if (typeof parsedFinanceiro.envolveFundos === 'string') {
                parsedFinanceiro.envolveFundos = parsedFinanceiro.envolveFundos === 'true';
            }
            eventoData.financeiro = parsedFinanceiro;
        }

        const novoEvento = new Evento(eventoData);
        await novoEvento.save();
        res.status(201).json(novoEvento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar evento', error: error.message });
    }
});

// PUT /api/eventos/:id - Atualizar um evento do tenant
router.put('/:id', upload.single('cartaz'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        const existingEvento = await Evento.findOne({ _id: req.params.id, tenantId: req.tenant.id });

        if (!existingEvento) {
            return res.status(404).json({ message: 'Evento não encontrado' });
        }

        if (req.file) {
            if (existingEvento.cartazUrl) {
                const oldKey = getS3KeyFromUrl(existingEvento.cartazUrl);
                if (oldKey) await s3Delete(oldKey);
            }
            updateData.cartazUrl = req.file.location;
        }

        if (req.body.financeiro) {
            const parsedFinanceiro = JSON.parse(req.body.financeiro);
            if (typeof parsedFinanceiro.envolveFundos === 'string') {
                parsedFinanceiro.envolveFundos = parsedFinanceiro.envolveFundos === 'true';
            }
            updateData.financeiro = parsedFinanceiro;
        }

        const eventoAtualizado = await Evento.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenant.id },
            updateData,
            { new: true }
        );
        res.json(eventoAtualizado);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar evento', error: error.message });
    }
});

// --- SUB-DOCUMENTOS (TAREFAS E TRANSAÇÕES) DENTRO DO TENANT ---

router.post('/:id/tarefas', async (req, res) => {
    try {
        const evento = await Evento.findOne({ _id: req.params.id, tenantId: req.tenant.id });
        if (!evento) return res.status(404).json({ message: 'Evento não encontrado' });

        evento.tarefas.push(req.body);
        await evento.save();
        res.status(201).json(evento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao adicionar tarefa', error });
    }
});

router.put('/:id/tarefas/:tarefaId', async (req, res) => {
    try {
        const evento = await Evento.findOne({ _id: req.params.id, tenantId: req.tenant.id });
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

router.delete('/:id/tarefas/:tarefaId', async (req, res) => {
    try {
        const evento = await Evento.findOne({ _id: req.params.id, tenantId: req.tenant.id });
        if (!evento) return res.status(404).json({ message: 'Evento não encontrado' });
        
        const tarefa = evento.tarefas.id(req.params.tarefaId);
        if (tarefa) {
          tarefa.remove();
        } else {
          return res.status(404).json({ message: 'Tarefa não encontrada' });
        }
        
        await evento.save();
        res.json(evento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir tarefa', error });
    }
});

router.post('/:id/transacoes', async (req, res) => {
    try {
        const evento = await Evento.findOne({ _id: req.params.id, tenantId: req.tenant.id });
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

// DELETE /api/eventos/:id - Excluir um evento
router.delete('/:id', async (req, res) => {
    try {
        const evento = await Evento.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!evento) {
            return res.status(404).json({ message: 'Evento não encontrado' });
        }
        if (evento.cartazUrl) {
            const oldKey = getS3KeyFromUrl(evento.cartazUrl);
            if (oldKey) await s3Delete(oldKey);
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir evento', error });
    }
});

export default router;