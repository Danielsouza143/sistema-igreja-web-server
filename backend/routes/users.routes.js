import express from 'express';
import User from '../models/user.model.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();

// @desc    Criar um novo usuário
// @route   POST /api/users
router.post('/', async (req, res, next) => {
    try {
        const { username, password, role, name } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
        }

        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'Um usuário com este e-mail já está cadastrado.' });
        }

        const newUser = new User({
            username: username.toLowerCase(),
            password, // A senha será criptografada automaticamente pelo hook 'pre-save' no model
            role: role || 'operador',
            name: name || username
        });

        await newUser.save();
        
        await logActivity(req.user, 'CREATE_USER', `Usuário '${newUser.username}' foi criado.`);

        // Retorna o usuário criado (sem a senha)
        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            name: newUser.name,
            role: newUser.role,
        });
    } catch (error) {
        next(error); // Passa o erro para o middleware de tratamento de erros global
    }
});

// @desc    Obter todos os usuários
// @route   GET /api/users
router.get('/', async (req, res, next) => {
    try {
        const users = await User.find({}).select('-password');
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

// @desc    Atualizar um usuário
// @route   PUT /api/users/:id
router.put('/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        user.name = req.body.name || user.name;
        user.role = req.body.role || user.role;
        
        // Permite a atualização do username, verificando se já não está em uso por outro usuário
        if (req.body.username && req.body.username.toLowerCase() !== user.username) {
            const existingUser = await User.findOne({ username: req.body.username.toLowerCase() });
            if (existingUser) {
                return res.status(409).json({ message: 'Este nome de usuário já está em uso.' });
            }
            user.username = req.body.username.toLowerCase();
        }

        if (req.body.password) {
            user.password = req.body.password; // O hook pre-save irá hashear
        }

        const updatedUser = await user.save();
        await logActivity(req.user, 'UPDATE_USER', `Usuário '${updatedUser.username}' foi atualizado.`);
        res.status(200).json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error) {
        next(error);
    }
});

// @desc    Deletar um usuário
// @route   DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
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