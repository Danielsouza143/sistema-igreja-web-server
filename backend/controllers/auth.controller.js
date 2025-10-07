import User from '../models/user.model.js';
import Config from '../models/config.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Importa o módulo crypto
import sendEmail from '../utils/sendEmail.js'; // Importa a função de enviar email

// Função para gerar o código MFA
const generateMfaCode = () => {
    return crypto.randomInt(100000, 999999).toString();
};

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

        // Lógica do MFA
        if (!user.mfaVerified) {
            const mfaCode = generateMfaCode();
            user.mfaCode = mfaCode; // Idealmente, hasheie o código antes de salvar
            user.mfaCodeExpires = Date.now() + 10 * 60 * 1000; // Expira em 10 minutos
            await user.save();

            try {
                await sendEmail({
                    email: user.username, // Assumindo que o username é o e-mail
                    subject: 'Seu código de verificação de dois fatores',
                    message: `Olá ${user.name || 'usuário'},\n\nSeu código de verificação é: ${mfaCode}\n\nEste código expira em 10 minutos.\n`
                });

                return res.status(200).json({ mfaRequired: true, message: 'Código de verificação enviado para o seu e-mail.' });

            } catch (error) {
                console.error('Erro ao enviar e-mail de MFA:', error);
                return res.status(500).json({ message: 'Não foi possível enviar o código de verificação. Tente novamente mais tarde.' });
            }
        }

        // Se MFA já foi verificado, procede com o login normal
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
        const userCount = await User.countDocuments();
        const config = await Config.findOne();
        
        res.status(200).json({ 
            needsSetup: userCount === 0,
            churchName: config?.identidade?.nomeIgreja || 'Igreja'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verifica se o MFA é necessário para um usuário.
 */
export const getMfaStatus = async (req, res, next) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ message: 'Nome de usuário é obrigatório.' });
    }

    try {
        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            // Não revela se o usuário existe por segurança
            return res.status(200).json({ mfaRequired: false });
        }

        res.status(200).json({ mfaRequired: !user.mfaVerified });

    } catch (error) {
        next(error);
    }
};

/**
 * Verifica o código MFA e completa o login.
 */
export const verifyMfa = async (req, res, next) => {
    const { username, mfaCode } = req.body;

    if (!username || !mfaCode) {
        return res.status(400).json({ message: 'Nome de usuário e código MFA são obrigatórios.' });
    }

    try {
        const user = await User.findOne({ 
            username: username.toLowerCase(), 
            mfaCode: mfaCode, 
            mfaCodeExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ message: 'Código de verificação inválido ou expirado.' });
        }

        // Marca o MFA como verificado e limpa os campos
        user.mfaVerified = true;
        user.mfaCode = undefined;
        user.mfaCodeExpires = undefined;
        await user.save();

        // Gera o token JWT para finalizar o login
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