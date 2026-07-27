import express from 'express';
import Tenant from '../models/tenant.model.js';
import { protect } from '../middleware/auth.middleware.js'; // Garantindo a proteção

const router = express.Router();

// 1. ROTA DE STATUS (Restaurada! Essencial para o Login funcionar)
router.get('/status', protect, async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.tenant.id);
        if (!tenant) {
            return res.status(404).json({ message: 'Igreja (Tenant) não encontrada.' });
        }
        res.status(200).json({
            status: tenant.status,
            completedOnboard: tenant.config ? tenant.config.completedOnboard : false
        });
    } catch (error) {
        console.error('Erro ao verificar status do tenant:', error);
        res.status(500).json({ message: 'Erro no servidor ao verificar status.' });
    }
});

// 2. ROTA CURRENT (Essencial para o Recibo e Tela de Configurações)
router.get('/current', protect, async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.tenant.id);
        if (!tenant) {
            return res.status(404).json({ message: 'Igreja (Tenant) não encontrada.' });
        }
        res.status(200).json(tenant);
    } catch (error) {
        console.error('Erro ao buscar dados do tenant atual:', error);
        res.status(500).json({ message: 'Erro ao buscar dados da igreja.' });
    }
});

// 3. Listar todos os tenants (GET /api/tenants)
router.get('/', async (req, res) => {
    try {
        const tenants = await Tenant.find().sort({ createdAt: -1 });
        res.status(200).json(tenants);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar igrejas.' });
    }
});

// 4. Criar novo tenant (POST /api/tenants)
router.post('/', async (req, res) => {
    try {
        const { name, slug, type } = req.body;
        if (!name || !slug) return res.status(400).json({ message: 'Nome e Slug são obrigatórios.' });

        const existingTenant = await Tenant.findOne({ slug });
        if (existingTenant) return res.status(400).json({ message: 'Este slug já está em uso.' });

        const newTenant = new Tenant({
            name,
            slug,
            tenantType: type || 'filial',
            status: 'active'
        });

        await newTenant.save();
        res.status(201).json(newTenant);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar igreja.' });
    }
});

export default router;
