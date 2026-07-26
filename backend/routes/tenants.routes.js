import express from 'express';
import Tenant from '../models/tenant.model.js';

const router = express.Router();

// NOVO: Obter dados do Tenant atual (Igreja do usuário logado)
router.get('/current', async (req, res) => {
    try {
        // req.tenant.id é injetado pelo middleware de proteção global
        const tenant = await Tenant.findById(req.tenant.id).select('name cnpj address config');
        if (!tenant) {
            return res.status(404).json({ message: 'Igreja (Tenant) não encontrada.' });
        }
        res.status(200).json(tenant);
    } catch (error) {
        console.error('Erro ao buscar dados do tenant atual:', error);
        res.status(500).json({ message: 'Erro ao buscar dados da igreja.' });
    }
});

// Listar todos os tenants (GET /api/tenants)
router.get('/', async (req, res) => {
    try {
        const tenants = await Tenant.find().sort({ createdAt: -1 });
        res.status(200).json(tenants);
    } catch (error) {
        console.error('Erro ao buscar tenants:', error);
        res.status(500).json({ message: 'Erro ao buscar igrejas.' });
    }
});

// Criar novo tenant (POST /api/tenants)
router.post('/', async (req, res) => {
    try {
        const { name, slug, type } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ message: 'Nome e Slug são obrigatórios.' });
        }

        const existingTenant = await Tenant.findOne({ slug });
        if (existingTenant) {
            return res.status(400).json({ message: 'Este identificador (slug) já está em uso.' });
        }

        const newTenant = new Tenant({
            name,
            slug,
            type: type || 'filial',
            status: 'Ativo'
        });

        await newTenant.save();
        res.status(201).json(newTenant);
    } catch (error) {
        console.error('Erro ao criar tenant:', error);
        res.status(500).json({ message: 'Erro ao criar igreja.' });
    }
});

export default router;
