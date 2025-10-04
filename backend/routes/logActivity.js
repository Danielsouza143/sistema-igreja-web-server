import Log from '../models/log.model.js';

/**
 * Registra uma atividade no log do sistema.
 * @param {object} user - O objeto do usuário (de req.user).
 * @param {string} action - Um código para a ação (ex: 'CREATE_USER').
 * @param {string} details - Uma descrição da ação.
 * @param {string} [targetId] - O ID do documento afetado.
 */
export const logActivity = async (user, action, details, targetId = null) => {
    try {
        if (!user || !user._id) return; // Não registra se não houver usuário
        await Log.create({
            user: user._id,
            username: user.username,
            action,
            details,
            targetId
        });
    } catch (error) {
        console.error('Falha ao registrar atividade no log:', error);
    }
};