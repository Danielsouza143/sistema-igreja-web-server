import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Tenant from '../models/tenant.model.js';
import User from '../models/user.model.js';
import Membro from '../models/membro.model.js';
import Lancamento from '../models/lancamento.model.js';

export const getFiliais = async (req, res, next) => {
    try {
        const sedeId = req.tenant.id;
        const filiais = await Tenant.find({ parentTenant: sedeId }).lean();
        
        // Mágica SaaS: Busca os dados enriquecidos de cada Filial para o Modal e Tabela
        const filiaisEnriquecidas = await Promise.all(filiais.map(async (filial) => {
            // Puxa o administrador (Pastor local)
            const admin = await User.findOne({ tenantId: filial._id, role: 'admin' }).select('name username').lean();
            
            // Puxa total de Membros
            const membrosCount = await Membro.countDocuments({ tenantId: filial._id });
            
            // Puxa balanço financeiro exclusivo desta filial
            const lancamentos = await Lancamento.aggregate([
                { $match: { tenantId: filial._id } },
                { $group: { _id: '$tipo', total: { $sum: '$valor' } } }
            ]);
            const financeiro = lancamentos.reduce((acc, curr) => {
                acc[curr._id] = curr.total; return acc;
            }, { entrada: 0, saida: 0 });

            return {
                ...filial,
                pastor: admin ? admin.name : 'Não Designado',
                membros: membrosCount,
                receitas: financeiro.entrada,
                despesas: financeiro.saida,
                saldo: financeiro.entrada - financeiro.saida,
                logoUrl: filial.config ? filial.config.logoUrl : null
            };
        }));

        res.status(200).json(filiaisEnriquecidas);
    } catch (error) {
        next(error);
    }
};

export const createFilial = async (req, res, next) => {
    // CORREÇÃO CRÍTICA: Extraindo e salvando cnpj, address e telefone na criação
    const { name, adminUsername, adminName, adminPassword, cnpj, address, telefone } = req.body;
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
            cnpj: cnpj || '',
            address: address || '',
            telefone: telefone || '',
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

export const updateFilial = async (req, res, next) => {
    const { id: filialId } = req.params;
    const sedeId = req.tenant.id;
    const { name, address, cnpj, telefone } = req.body;

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
        if (telefone) filial.telefone = telefone;

        const updatedFilial = await filial.save();

        res.status(200).json(updatedFilial);

    } catch (error) {
        next(error);
    }
};

export const getDashboardData = async (req, res, next) => {
    try {
        const sedeId = req.tenant.id;

        // Pega as filiais E a própria sede para consolidar TUDO da rede
        const filiais = await Tenant.find({ parentTenant: sedeId }).select('_id name');
        const tenantIds = filiais.map(f => f._id);
        tenantIds.push(new mongoose.Types.ObjectId(sedeId));

        const [
            totalMembros,
            totalFinanceiro,
            membrosPorTenant,
            evolucaoMensalRaw
        ] = await Promise.all([
            Membro.countDocuments({ tenantId: { $in: tenantIds } }),
            
            Lancamento.aggregate([
                { $match: { tenantId: { $in: tenantIds } } },
                { $group: { _id: '$tipo', total: { $sum: '$valor' } } }
            ]),
            
            Membro.aggregate([
                { $match: { tenantId: { $in: tenantIds } } },
                { $group: { _id: '$tenantId', count: { $sum: 1 } } },
                { $lookup: { from: 'tenants', localField: '_id', foreignField: '_id', as: 'tenantInfo' } },
                { $unwind: '$tenantInfo' },
                { $project: { tenantId: '$_id', nome: '$tenantInfo.name', membros: '$count' } }
            ]),

            // Agregação para o Gráfico de Evolução Financeira Global
            Lancamento.aggregate([
                { $match: { tenantId: { $in: tenantIds }, data: { $exists: true } } },
                { $project: {
                    ano: { $year: "$data" },
                    mes: { $month: "$data" },
                    tipo: 1,
                    valor: 1
                }},
                { $match: { ano: new Date().getFullYear() } }, // Filtra só o ano atual
                { $group: {
                    _id: { mes: "$mes", tipo: "$tipo" },
                    total: { $sum: "$valor" }
                }}
            ])
        ]);

        const financeiro = totalFinanceiro.reduce((acc, item) => {
            acc[item._id] = item.total;
            return acc;
        }, { entrada: 0, saida: 0 });
        
        // Estruturando os dados para os gráficos do Frontend
        const evolucaoMensal = Array(12).fill(null).map(() => ({ entradas: 0, saidas: 0 }));
        evolucaoMensalRaw.forEach(item => {
            const mesIdx = item._id.mes - 1;
            if (item._id.tipo === 'entrada') evolucaoMensal[mesIdx].entradas = item.total;
            if (item._id.tipo === 'saida') evolucaoMensal[mesIdx].saidas = item.total;
        });

        const dashboardData = {
            resumo: {
                totalFiliais: filiais.length,
                totalMembros: totalMembros,
                totalEntradas: financeiro.entrada,
                totalSaidas: financeiro.saida,
                saldoGlobal: financeiro.entrada - financeiro.saida
            },
            comparativoFiliais: membrosPorTenant.sort((a, b) => b.membros - a.membros),
            graficos: {
                evolucaoFinanceira: evolucaoMensal
            }
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        next(error);
    }
};

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
            impersonatorId: sedeAdminId, // Marca que é um acesso de auditoria
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
