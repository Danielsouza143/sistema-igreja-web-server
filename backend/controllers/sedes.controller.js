import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Tenant from '../models/tenant.model.js';
import User from '../models/user.model.js';
import Membro from '../models/membro.model.js';
import Lancamento from '../models/lancamento.model.js';

/**
 * @desc    Listar todas as filiais de uma Sede
 * @route   GET /api/sedes/filiais
 * @access  Private (Admin de Sede)
 */
export const getFiliais = async (req, res, next) => {
    try {
        const sedeId = req.tenant.id;
        const filiais = await Tenant.find({ parentTenant: sedeId });
        res.status(200).json(filiais);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Criar uma nova Filial e seu primeiro admin
 * @route   POST /api/sedes/filiais
 * @access  Private (Admin de Sede)
 */
export const createFilial = async (req, res, next) => {
    const { name, adminUsername, adminName, adminPassword } = req.body;
    const sedeId = req.tenant.id;

    if (!name || !adminUsername || !adminName || !adminPassword) {
        return res.status(400).json({ message: 'Nome da filial, usuário, nome e senha do admin são obrigatórios.' });
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

        const newFilial = new Tenant({
            name,
            tenantType: 'filial',
            parentTenant: sedeId,
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

        res.status(201).json({ message: 'Filial e administrador criados com sucesso!', filial: savedFilial });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

/**
 * @desc    Atualizar os dados de uma Filial
 * @route   PUT /api/sedes/filiais/:id
 * @access  Private (Admin de Sede)
 */
export const updateFilial = async (req, res, next) => {
    const { id: filialId } = req.params;
    const sedeId = req.tenant.id;
    const { name, address, cnpj } = req.body;

    try {
        const filial = await Tenant.findById(filialId);

        if (!filial) {
            return res.status(404).json({ message: 'Filial não encontrada.' });
        }

        if (filial.parentTenant.toString() !== sedeId) {
            return res.status(403).json({ message: 'Acesso negado. Esta filial não pertence à sua Sede.' });
        }

        filial.name = name || filial.name;
        filial.address = address || filial.address;
        filial.cnpj = cnpj || filial.cnpj;

        const updatedFilial = await filial.save();

        res.status(200).json(updatedFilial);

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Obter dados consolidados para o dashboard da Sede
 * @route   GET /api/sedes/dashboard
 * @access  Private (Admin de Sede)
 */
export const getDashboardData = async (req, res, next) => {
    try {
        const sedeId = req.tenant.id;

        const filiais = await Tenant.find({ parentTenant: sedeId }).select('_id name');
        const filialIds = filiais.map(f => f._id);

        const [
            totalMembros,
            totalFinanceiro,
            membrosPorFilial
        ] = await Promise.all([
            Membro.countDocuments({ tenantId: { $in: filialIds } }),
            Lancamento.aggregate([
                { $match: { tenantId: { $in: filialIds } } },
                { $group: { _id: '$tipo', total: { $sum: '$valor' } } }
            ]),
            Membro.aggregate([
                { $match: { tenantId: { $in: filialIds } } },
                { $group: { _id: '$tenantId', count: { $sum: 1 } } },
                { $lookup: { from: 'tenants', localField: '_id', foreignField: '_id', as: 'filialInfo' } },
                { $unwind: '$filialInfo' },
                { $project: { filialId: '$_id', nome: '$filialInfo.name', membros: '$count' } }
            ])
        ]);

        const financeiro = totalFinanceiro.reduce((acc, item) => {
            acc[item._id] = item.total;
            return acc;
        }, { entrada: 0, saida: 0 });
        
        const dashboardData = {
            resumo: {
                totalFiliais: filiais.length,
                totalMembros: totalMembros,
                totalEntradas: financeiro.entrada,
                totalSaidas: financeiro.saida
            },
            comparativoFiliais: membrosPorFilial.sort((a, b) => b.membros - a.membros)
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Gerar um token de impersonação para acessar uma filial
 * @route   POST /api/sedes/filiais/:id/impersonate
 * @access  Private (Admin de Sede)
 */
export const impersonateFilial = async (req, res, next) => {
    const { id: filialId } = req.params;
    const sedeId = req.tenant.id;
    const sedeAdminId = req.user.id;

    try {
        const filial = await Tenant.findById(filialId);

        if (!filial || filial.tenantType !== 'filial') {
            return res.status(404).json({ message: 'Filial não encontrada.' });
        }

        if (filial.parentTenant.toString() !== sedeId) {
            return res.status(403).json({ message: 'Acesso negado. Esta filial não pertence à sua Sede.' });
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
            impersonatorId: sedeAdminId,
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
