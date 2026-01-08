import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Tenant from '../models/tenant.model.js';
import User from '../models/user.model.js';
import Lancamento from '../models/lancamento.model.js';
import Log from '../models/log.model.js';
// ... (o resto das funções do controller)

/**
 * @desc    Listar todos os tenants (Sedes e Filiais)
 * @route   GET /api/admin/tenants
 * @access  Private (Super Admin)
 */
export const getAllTenants = async (req, res, next) => {
    try {
        const tenants = await Tenant.find({})
            .populate('parentTenant', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(tenants);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Criar uma nova Sede e seu primeiro admin
 * @route   POST /api/admin/tenants/sede
 * @access  Private (Super Admin)
 */
export const createSede = async (req, res, next) => {
    const { name, adminUsername, adminName, adminPassword } = req.body;

    if (!name || !adminUsername || !adminName || !adminPassword) {
        return res.status(400).json({ message: 'Nome da Sede, usuário, nome e senha do admin são obrigatórios.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const existingUser = await User.findOne({ username: adminUsername.toLowerCase() }).session(session);
        if (existingUser) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({ message: 'Este nome de usuário para o administrador já está em uso.' });
        }

        const newSede = new Tenant({
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            tenantType: 'sede',
            parentTenant: null,
        });
        const savedSede = await newSede.save({ session });

        const newAdmin = new User({
            username: adminUsername.toLowerCase(),
            name: adminName,
            password: adminPassword,
            role: 'admin',
            tenantId: savedSede._id,
        });
        await newAdmin.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log(`✅ NOVA SEDE CRIADA: ${savedSede.name} (ID: ${savedSede._id}) no banco.`);
        res.status(201).json({ message: 'Sede e administrador criados com sucesso!', sede: savedSede });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

/**
 * @desc    Criar uma nova Filial e seu primeiro admin
 * @route   POST /api/admin/tenants/filial
 * @access  Private (Super Admin)
 */
export const createFilial = async (req, res, next) => {
    const { name, parentTenantId, adminUsername, adminName, adminPassword } = req.body;

    if (!name || !parentTenantId || !adminUsername || !adminName || !adminPassword) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Verifica se a Sede existe
        const sede = await Tenant.findById(parentTenantId);
        if (!sede || sede.tenantType !== 'sede') {
            throw new Error('Sede inválida ou não encontrada.');
        }

        const existingUser = await User.findOne({ username: adminUsername.toLowerCase() }).session(session);
        if (existingUser) {
            throw new Error('Este nome de usuário já está em uso.');
        }

        const newFilial = new Tenant({
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            tenantType: 'filial',
            parentTenant: parentTenantId,
        });
        const savedFilial = await newFilial.save({ session });

        const newAdmin = new User({
            username: adminUsername.toLowerCase(),
            name: adminName,
            password: adminPassword,
            role: 'admin',
            tenantId: savedFilial._id,
        });
        await newAdmin.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log(`✅ NOVA FILIAL CRIADA: ${savedFilial.name} (ID: ${savedFilial._id}) vinculada a ${sede.name}.`);
        res.status(201).json({ message: 'Filial criada com sucesso!', filial: savedFilial });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: error.message });
    }
};

/**
 * @desc    Alterar o status de um tenant (active/suspended)
 * @route   PATCH /api/admin/tenants/:id/status
 * @access  Private (Super Admin)
 */
export const updateTenantStatus = async (req, res, next) => {
    const { id: tenantId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Use 'active' ou 'suspended'." });
    }

    try {
        const tenant = await Tenant.findById(tenantId);

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        tenant.status = status;
        await tenant.save();

        res.status(200).json({ message: `Tenant ${tenant.name} foi atualizado para '${status}'.`, tenant });

    } catch (error) {
        next(error);
    }
};

// --- GESTÃO DE USUÁRIOS GLOBAIS ---

/**
 * @desc    Listar todos os usuários do sistema
 * @route   GET /api/admin/users
 */
export const getAllUsers = async (req, res, next) => {
    try {
        // Busca usuários e popula o nome do Tenant (Igreja)
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 });
        
        // Precisamos fazer o populate manual ou lookup se tenantId não for ref direta no schema, 
        // mas assumindo que tenantId é ObjectId:
        // Se não for ref, fazemos um map:
        const tenants = await Tenant.find({}).select('name type');
        const tenantMap = tenants.reduce((acc, t) => ({ ...acc, [t._id.toString()]: t }), {});

        const usersWithTenant = users.map(u => ({
            ...u.toObject(),
            tenantName: u.role === 'super_admin' ? 'Acesso Global' : (u.tenantId && tenantMap[u.tenantId.toString()] ? tenantMap[u.tenantId.toString()].name : 'N/A')
        }));

        res.status(200).json(usersWithTenant);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Criar usuário globalmente
 * @route   POST /api/admin/users
 */
export const createGlobalUser = async (req, res, next) => {
    let { name, username, password, role, tenantId } = req.body;
    try {
        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ message: 'Usuário já existe.' });

        const user = new User({
            name,
            username: username.toLowerCase(),
            password,
            role,
            tenantId: role === 'super_admin' ? null : tenantId
        });
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Atualizar usuário globalmente
 * @route   PUT /api/admin/users/:id
 */
export const updateGlobalUser = async (req, res, next) => {
    const { id } = req.params;
    let { name, username, password, role, tenantId } = req.body;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        user.name = name || user.name;
        user.username = username || user.username;
        user.role = role || user.role;
        user.tenantId = role === 'super_admin' ? null : (tenantId || user.tenantId);
        if (password) user.password = password;

        await user.save();
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Deletar usuário globalmente
 * @route   DELETE /api/admin/users/:id
 */
export const deleteGlobalUser = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Usuário removido.' });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Obter estatísticas globais do SaaS
 * @route   GET /api/admin/stats
 * @access  Private (Super Admin)
 */
export const getGlobalStats = async (req, res, next) => {
    try {
        const [
            totalTenants,
            totalUsers,
            totalFinanceiro
        ] = await Promise.all([
            Tenant.countDocuments(),
            User.countDocuments({ role: { $ne: 'super_admin' } }),
            Lancamento.aggregate([
                { $group: { _id: '$tipo', total: { $sum: '$valor' } } }
            ])
        ]);

        const financeiro = totalFinanceiro.reduce((acc, item) => {
            acc[item._id] = item.total;
            return acc;
        }, { entrada: 0, saida: 0 });

        const stats = {
            totalTenants,
            totalUsers,
            totalEntradas: financeiro.entrada,
            totalSaidas: financeiro.saida,
        };

        res.status(200).json(stats);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Obter os 100 logs mais recentes do sistema
 * @route   GET /api/admin/logs
 * @access  Private (Super Admin)
 */
export const getGlobalLogs = async (req, res, next) => {
    try {
        const logs = await Log.find({})
            .sort({ createdAt: -1 })
            .limit(100);
        
        res.status(200).json(logs);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Gerar um token de impersonação para acessar uma Sede
 * @route   POST /api/admin/tenants/:id/impersonate
 * @access  Private (Super Admin)
 */
export const impersonateSede = async (req, res, next) => {
    const { id: sedeId } = req.params;
    const superAdminId = req.user.id;

    try {
        const sede = await Tenant.findById(sedeId);

        if (!sede || sede.tenantType !== 'sede') {
            return res.status(404).json({ message: 'Sede não encontrada.' });
        }

        const sedeAdmin = await User.findOne({ tenantId: sedeId, role: 'admin' });
        if (!sedeAdmin) {
            return res.status(404).json({ message: 'Administrador da Sede não encontrado.' });
        }

        const impersonationPayload = {
            id: sedeAdmin._id,
            role: sedeAdmin.role,
            tenantId: sede.id,
            tenantType: sede.tenantType,
            impersonatorId: superAdminId,
        };

        const impersonationToken = jwt.sign(impersonationPayload, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.status(200).json({
            message: `Iniciando modo de supervisão para ${sede.name}.`,
            impersonationToken
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Gerar um token de impersonação para acessar uma Filial
 * @route   POST /api/admin/filiais/:id/impersonate
 * @access  Private (Super Admin)
 */
export const impersonateFilial = async (req, res, next) => {
    const { id: filialId } = req.params;
    const superAdminId = req.user.id;

    try {
        const filial = await Tenant.findById(filialId);

        if (!filial || filial.tenantType !== 'filial') {
            return res.status(404).json({ message: 'Filial não encontrada.' });
        }

        const filialAdmin = await User.findOne({ tenantId: filialId, role: 'admin' });
        if (!filialAdmin) {
            return res.status(404).json({ message: 'Administrador da filial não encontrado.' });
        }

        const impersonationPayload = {
            id: filialAdmin._id,
            role: filialAdmin.role,
            tenantId: filial.id,
            tenantType: filial.tenantType,
            impersonatorId: superAdminId,
        };

        const impersonationToken = jwt.sign(impersonationPayload, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.status(200).json({
            message: `Iniciando modo de supervisão para ${filial.name}.`,
            impersonationToken
        });

    } catch (error) {
        next(error);
    }
};