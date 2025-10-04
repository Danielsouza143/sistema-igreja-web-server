import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            // Se o token for inválido ou expirado, retorne o erro e pare a execução.
            return res.status(401).json({ message: 'Não autorizado, token inválido ou expirado.' });
        }
    }
    // Se não houver nenhum token no header, retorne o erro.
    if (!token) {
        return res.status(401).json({ message: 'Não autorizado, sem token.' });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Requer permissão de administrador.' });
    }
};
