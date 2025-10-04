import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

/**
 * Lida com o login de um usuário.
 */
export const login = async (req, res, next) => {
    const { username, password } = req.body;

    // 1. Validação básica da entrada
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }

    try {
        // 2. Busca o usuário no banco de dados (sempre em minúsculas)
        // O .select('+password') é crucial para trazer a senha, que por padrão está oculta no model.
        const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

        // 3. VERIFICAÇÃO CRÍTICA: Se o usuário não existe, retorna erro 401.
        // Isso previne o erro 500 que estava acontecendo.
        if (!user) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        // 4. Compara a senha fornecida com a senha hasheada no banco
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        // 5. Se tudo estiver correto, gera o token JWT
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '8h' // Token expira em 8 horas
        });

        // 6. Prepara a resposta, removendo dados sensíveis
        const userResponse = {
            id: user._id,
            username: user.username,
            role: user.role
        };

        res.status(200).json({ token, user: userResponse });

    } catch (error) {
        // Encaminha qualquer outro erro inesperado para o middleware de erro
        next(error);
    }
};

/**
 * Verifica se o sistema precisa de configuração inicial (criação do primeiro admin).
 * Isso é usado pela página de login para decidir se redireciona para a tela de setup.
 */
export const getSetupStatus = async (req, res, next) => {
    try {
        // Conta quantos usuários com a role 'admin' existem no banco de dados.
        const adminCount = await User.countDocuments({ role: 'admin' });

        res.status(200).json({ needsSetup: adminCount === 0 });
    } catch (error) {
        next(error);
    }
};