/**
 * Middlewares para verificação de permissões baseadas em Tenant e Role.
 * 
 * Estes middlewares devem ser usados DEPOIS do middleware de autenticação principal (`auth.middleware.js`),
 * pois eles dependem de `req.user` e `req.tenant` que são populados na autenticação.
 */

const checkRole = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Acesso negado. Permissão insuficiente.' });
    }
    next();
};

const checkTenantType = (types) => (req, res, next) => {
    if (!req.tenant || !types.includes(req.tenant.type)) {
        return res.status(403).json({ message: 'Acesso negado. Tipo de tenant incompatível com este recurso.' });
    }
    next();
};

// Verifica se o usuário é Super Admin
export const requireSuperAdmin = checkRole(['super_admin']);

// Verifica se o usuário tem a role de Admin (não super_admin)
export const requireAdmin = checkRole(['admin']);

// Verifica se o tenant é do tipo Sede
export const requireSede = checkTenantType(['sede']);

// Verifica se o tenant é do tipo Filial
export const requireFilial = checkTenantType(['filial']);

// Combinação: precisa ser um admin de uma Sede
export const requireSedeAdmin = [checkRole(['admin']), checkTenantType(['sede'])];

// Combinação: permite operadores ou admins
export const requireOperadorOrAdmin = checkRole(['operador', 'admin']);
