import express from 'express';
import User from '../models/user.model.js';
import { logActivity } from '../utils/logActivity.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protege todas as rotas de usuários
router.use(protect);

// @desc    Criar um novo usuário para o tenant
// @route   POST /api/users
router.post('/', async (req, res, next) => {
    try {
        const { username, password, role, name } = req.body;
        const tenantId = req.tenant.id;

        if (!username || !password) {
            return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'Um usuário com este e-mail já está cadastrado.' });
        }

        const newUser = new User({
            username: username.toLowerCase(),
            password,
            role: role || 'operador',
            name: name || username,
            tenantId: tenantId
        });

        await newUser.save();
        await logActivity(req.user, 'CREATE_USER', `Usuário '${newUser.username}' foi criado.`);

        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            name: newUser.name,
            role: newUser.role,
        });
    } catch (error) {
        next(error);
    }
});

// @desc    Obter todos os usuários do tenant
// @route   GET /api/users
router.get('/', async (req, res, next) => {
    try {
        const users = await User.find({ tenantId: req.tenant.id }).select('-password');
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

// @desc    Atualizar um usuário do tenant
// @route   PUT /api/users/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { name, role, username, password } = req.body;

        const user = await User.findOne({ _id: req.params.id, tenantId: req.tenant.id }).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        if (name) user.name = name;
        if (role) user.role = role;
        
        if (username && username.toLowerCase() !== user.username) {
            const existingUser = await User.findOne({ username: username.toLowerCase() });
            if (existingUser) {
                return res.status(409).json({ message: 'Este nome de usuário já está em uso.' });
            }
            user.username = username.toLowerCase();
        }

        if (password) {
            user.password = password;
        }

        const updatedUser = await user.save();
        await logActivity(req.user, 'UPDATE_USER', `Usuário '${updatedUser.username}' foi atualizado.`);

        res.status(200).json({
            _id: updatedUser._id,
            username: updatedUser.username,
            name: updatedUser.name,
            role: updatedUser.role,
        });
    } catch (error) {
        next(error);
    }
});

// @desc    Deletar um usuário do tenant
// @route   DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const user = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant.id });
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        await logActivity(req.user, 'DELETE_USER', `Usuário '${user.username}' foi excluído.`);
        res.status(200).json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
        next(error);
    }
});

export default router;