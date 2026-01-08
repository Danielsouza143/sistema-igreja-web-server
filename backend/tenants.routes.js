import express from 'express';
import Tenant from '../models/tenant.model.js';

const router = express.Router();

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

        // Verificar se o slug já existe
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