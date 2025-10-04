import express from 'express';
import mongoose from 'mongoose';

const visitantesRouter = express.Router();
const membrosRouter = express.Router();

// Simulação de um Model para 'presencas'
const Presenca = mongoose.models.Presenca || mongoose.model('Presenca', new mongoose.Schema({
    data: String,
    visitantes: [String] // Array de IDs
}, { collection: 'presencas', strict: false }));

const PresencaMembro = mongoose.models.PresencaMembro || mongoose.model('PresencaMembro', new mongoose.Schema({
    data: String,
    membros: [String] // Array de IDs
}, { collection: 'presencas_membros', strict: false }));

// --- ROTAS DE VISITANTES ---
visitantesRouter.get('/', async (req, res) => {
    try {
        const presencas = await Presenca.find();
        res.json(presencas);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar presenças de visitantes' });
    }
});

visitantesRouter.post('/', async (req, res) => {
    try {
        const { data, visitantes } = req.body;
        // upsert: true -> cria um novo se não encontrar, ou atualiza se encontrar
        const presenca = await Presenca.findOneAndUpdate(
            { data: data },
            { $set: { visitantes: visitantes } },
            { new: true, upsert: true }
        );
        res.status(201).json(presenca);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao salvar presença de visitantes', error });
    }
});

// --- ROTAS DE MEMBROS ---
membrosRouter.get('/', async (req, res) => {
    try {
        const presencas = await PresencaMembro.find();
        res.json(presencas);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar presenças de membros' });
    }
});

membrosRouter.post('/', async (req, res) => {
    try {
        const { data, membros } = req.body;
        const presenca = await PresencaMembro.findOneAndUpdate(
            { data: data },
            { $set: { membros: membros } },
            { new: true, upsert: true }
        );
        res.status(201).json(presenca);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao salvar presença de membros', error });
    }
});

export default {
    visitantes: visitantesRouter,
    membros: membrosRouter
};