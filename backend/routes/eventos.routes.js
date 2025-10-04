import express from 'express';
import Evento from '../models/evento.js';
import Config from '../models/config.js'; // Importar o modelo de Config

const router = express.Router();

// GET /api/eventos/configs - Rota para buscar configurações de eventos (categorias, etc.)
router.get('/configs', async (req, res) => {
    try {
        // Busca a primeira (e única) configuração do banco de dados
        const config = await Config.findOne();
        res.json({
            eventos_categorias: config ? config.eventos_categorias : [] // Retorna as categorias ou um array vazio
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

// POST /api/eventos - Criar um novo evento
router.post('/', async (req, res) => {
    try {
        const novoEvento = new Evento(req.body);
        await novoEvento.save();
        res.status(201).json(novoEvento);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar evento', error });
    }
});

// PUT /api/eventos/:id - Atualizar um evento
router.put('/:id', async (req, res) => {
    try {
        const eventoAtualizado = await Evento.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!eventoAtualizado) return res.status(404).json({ message: 'Evento não encontrado' });
        res.json(eventoAtualizado);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar evento', error });
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