import Log from '../models/log.model.js';

/**
 * Registra uma atividade no banco de dados.
 * @param {object} user - O objeto do usuário que realizou a ação.
 * @param {string} action - O tipo de ação (ex: 'CREATE_MEMBRO').
 * @param {string} details - Uma descrição da ação.
 * @param {mongoose.Types.ObjectId | null} entityId - O ID do documento afetado.
 */
export const logActivity = async (user, action, details, entityId = null) => {
    try {
        const log = new Log({
            user: user ? user.id : null,
            username: user ? user.username : 'Sistema',
            action,
            details,
            entityId
        });
        await log.save();
    } catch (error) {
        console.error('Falha ao registrar atividade no log:', error);
    }
};
