import User from '../models/user.model.js';
import Tenant from '../models/tenant.model.js'; // Importar o modelo Tenant
import Config from '../models/config.js';
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

        // Lógica Multi-Tenant para criar o payload do JWT
        let payload;

        if (user.role === 'super_admin') {
            payload = {
                id: user._id,
                role: 'super_admin',
                tenantId: null,
                tenantType: null
            };
        } else {
            if (!user.tenantId) {
                return res.status(403).json({ message: 'Usuário não está associado a nenhum tenant.' });
            }

            const tenant = await Tenant.findById(user.tenantId);
            if (!tenant) {
                return res.status(403).json({ message: 'Tenant associado ao usuário não foi encontrado.' });
            }

            payload = {
                id: user._id,
                role: user.role,
                tenantId: tenant._id,
                tenantType: tenant.tenantType
            };
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '8h'
        });

        const userResponse = {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            tenant: {
                id: payload.tenantId,
                name: payload.tenantType === 'super_admin' ? null : (await Tenant.findById(payload.tenantId))?.name,
                type: payload.tenantType
            }
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
        // Conta quantos usuários com a role 'super_admin' existem no banco de dados.
        const superAdminCount = await User.countDocuments({ role: 'super_admin' });
        const config = await Config.findOne({ singleton: 'main' }).select('identidade.nomeIgreja');
        
        res.status(200).json({ 
            needsSetup: superAdminCount === 0,
            churchName: config?.identidade?.nomeIgreja || 'Igreja'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cria o primeiro usuário Super Admin do sistema.
 */
export const setupSuperAdmin = async (req, res, next) => {
    const { username, password } = req.body;

    try {
        // Garante que esta rota só possa ser usada uma vez
        const superAdminCount = await User.countDocuments({ role: 'super_admin' });
        if (superAdminCount > 0) {
            return res.status(403).json({ message: 'O setup já foi concluído. Um Super Admin já existe.' });
        }

        const user = new User({
            username,
            password,
            name: 'Super Admin',
            role: 'super_admin',
            tenantId: null,
        });

        await user.save();

        const payload = {
            id: user._id,
            role: 'super_admin',
            tenantId: null,
            tenantType: null
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '8h'
        });

        const userResponse = {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
        };

        res.status(201).json({ token, user: userResponse });

    } catch (error) {
        next(error);
    }
};
