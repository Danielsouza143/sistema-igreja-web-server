import User from '../models/user.model.js';
import Config from './models/config.js';
import jwt from 'jsonwebtoken';

/**
 * Lida com o login de um usuário.
 */
export const login = async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }

    try {
        const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Usuário ou senha inválidos.' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '8h'
        });

        const userResponse = {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role
        };

        res.status(200).json({ token, user: userResponse });

    } catch (error) {
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
        const config = await Config.findOne({ singleton: 'main' }).select('identidade.nomeIgreja');
        
        res.status(200).json({ 
            needsSetup: adminCount === 0,
            churchName: config?.identidade?.nomeIgreja || 'Igreja'
        });
    } catch (error) {
        next(error);
    }
};
