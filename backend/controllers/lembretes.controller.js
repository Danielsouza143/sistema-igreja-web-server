import Lembrete from '../models/lembrete.model.js';
import Evento from '../models/evento.js';

export const getMyLembretes = async (req, res) => {
    console.log('getMyLembretes controller function hit.');
    try {
        const lembretes = await Lembrete.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(lembretes);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createLembrete = async (req, res) => {
    const { eventoId } = req.body;
    const userId = req.user.id;

    console.log('createLembrete: Received eventoId:', eventoId);
    console.log('createLembrete: Received userId:', userId);

    try {
        // Verifica se já existe um lembrete para este usuário e evento
        const existingLembrete = await Lembrete.findOne({ user: userId, 'relatedDoc.id': eventoId });
        if (existingLembrete) {
            return res.status(400).json({ message: 'Você já criou um lembrete para este evento.' });
        }

        // Busca os detalhes do evento
        const evento = await Evento.findById(eventoId);
        if (!evento) {
            return res.status(404).json({ message: 'Evento não encontrado.' });
        }

        // Cria a mensagem do lembrete
        const dataEvento = new Date(evento.dataInicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        const message = `Lembrete: Seu evento "${evento.nome}" está agendado para ${dataEvento}.`;

        const newLembrete = new Lembrete({
            user: userId,
            message,
            type: 'event-reminder',
            link: `/pages/agenda/agenda.html?eventId=${evento._id}`,
            relatedDoc: {
                id: evento._id,
                model: 'Evento'
            }
        });

        await newLembrete.save();
        res.status(201).json(newLembrete);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        await Lembrete.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
        res.status(200).json({ message: 'Todas as notificações foram marcadas como lidas.' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
