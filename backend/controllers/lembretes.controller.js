import Lembrete from '../models/lembrete.model.js';
import Evento from '../models/evento.js';

export const getMyLembretes = async (req, res) => {
    try {
        const lembretes = await Lembrete.find({ 
            user: req.user.id,
            tenantId: req.tenant.id // SCOPED
        }).sort({ createdAt: -1 });
        res.json(lembretes);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createLembrete = async (req, res) => {
    const { eventoId } = req.body;
    const userId = req.user.id;
    const tenantId = req.tenant.id;

    try {
        // Verifica se já existe um lembrete (scopo do tenant)
        const existingLembrete = await Lembrete.findOne({ 
            user: userId, 
            'relatedDoc.id': eventoId,
            tenantId: tenantId // SCOPED
        });
        if (existingLembrete) {
            return res.status(400).json({ message: 'Você já criou um lembrete para este evento.' });
        }

        // Busca os detalhes do evento (scopo do tenant)
        const evento = await Evento.findOne({ _id: eventoId, tenantId: tenantId }); //SCOPED
        if (!evento) {
            return res.status(404).json({ message: 'Evento não encontrado neste tenant.' });
        }

        const dataEvento = new Date(evento.dataInicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        const message = `Lembrete: Seu evento "${evento.nome}" está agendado para ${dataEvento}.`;

        const newLembrete = new Lembrete({
            user: userId,
            tenantId: tenantId, // SCOPED
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
        await Lembrete.updateMany(
            { user: req.user.id, tenantId: req.tenant.id, read: false }, // SCOPED
            { $set: { read: true } }
        );
        res.status(200).json({ message: 'Todas as notificações foram marcadas como lidas.' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
