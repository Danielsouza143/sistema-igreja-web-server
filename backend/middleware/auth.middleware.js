import jwt from 'jsonwebtoken';

/**
 * Middleware principal de autenticação.
 * Verifica o JWT, extrai as informações do payload e anexa ao objeto `req`.
 * Este middleware deve ser o primeiro em qualquer rota protegida.
 */
export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extrair token do header
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar e decodificar o token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Anexar informações de usuário e tenant ao `req`
            // Não há necessidade de consultar o banco de dados a cada requisição.
            // A informação no JWT é considerada confiável após a verificação.
            req.user = { id: decoded.id, role: decoded.role };
            req.tenant = { id: decoded.tenantId, type: decoded.tenantType };

            next();
        } catch (error) {
            console.error('Falha na verificação do token:', error.message);
            return res.status(401).json({ message: 'Não autorizado, token inválido ou expirado.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Não autorizado, nenhum token fornecido.' });
    }
};