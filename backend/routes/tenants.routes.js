import express from 'express';
import Tenant from '../models/tenant.model.js';
import { protect } from '../middleware/auth.middleware.js';

// Importações necessárias para o Onboarding
import { completeOnboarding } from '../controllers/tenants.controller.js';
import { s3Upload } from '../utils/s3-upload.js';

const router = express.Router();

// Configura o middleware de upload para salvar a logo no S3
const upload = s3Upload('logos', false);

// ==========================================
// ROTAS DE ONBOARDING (NOVA IMPLEMENTAÇÃO)
// ==========================================
// Mapeamos os 3 métodos para garantir que a requisição do frontend nunca retorne 404
router.patch('/onboarding', protect, upload.single('logo'), completeOnboarding);
router.put('/onboarding', protect, upload.single('logo'), completeOnboarding);
router.post('/onboarding', protect, upload.single('logo'), completeOnboarding);

// ==========================================
// ROTAS ORIGINAIS MANTIDAS INTEGRALMENTE
// ==========================================

// 1. Rota de Status (Usada no Login)
router.get('/status', protect, async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.tenant.id);
        if (!tenant) return res.status(404).json({ message: 'Igreja (Tenant) não encontrada.' });
        
        res.status(200).json({
            status: tenant.status,
            completedOnboard: tenant.config ? tenant.config.completedOnboard : false
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor ao verificar status.' });
    }
});

// 2. Rota para Buscar os Dados da Igreja Atual (Usada no Recibo e Configurações)
router.get('/current', protect, async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.tenant.id);
        if (!tenant) return res.status(404).json({ message: 'Igreja (Tenant) não encontrada.' });
        
        res.status(200).json(tenant);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados da igreja.' });
    }
});

// 3. NOVO: Rota para Salvar/Atualizar a Identidade da Igreja (Nome, CNPJ, Endereço, etc)
router.patch('/current', protect, async (req, res) => {
    try {
        const updates = req.body;
        
        // Mapeando apenas os campos da raiz para segurança
        const allowedUpdates = {};
        if (updates.name !== undefined) allowedUpdates.name = updates.name;
        if (updates.cnpj !== undefined) allowedUpdates.cnpj = updates.cnpj;
        if (updates.tipoDocumento !== undefined) allowedUpdates.tipoDocumento = updates.tipoDocumento; // Adicionado para suportar CPF/CNPJ dinâmico
        if (updates.telefone !== undefined) allowedUpdates.telefone = updates.telefone;
        if (updates.address !== undefined) allowedUpdates.address = updates.address;
        if (updates.email !== undefined) allowedUpdates.email = updates.email;

        const tenant = await Tenant.findByIdAndUpdate(
            req.tenant.id,
            { $set: allowedUpdates },
            { new: true }
        );

        if (!tenant) return res.status(404).json({ message: 'Igreja não encontrada.' });

        res.status(200).json(tenant);
    } catch (error) {
        console.error('Erro ao atualizar identidade da Igreja:', error);
        res.status(500).json({ message: 'Erro ao salvar informações da Igreja.' });
    }
});

// 4. Listar todos os tenants (Super Admin)
router.get('/', async (req, res) => {
    try {
        const tenants = await Tenant.find().sort({ createdAt: -1 });
        res.status(200).json(tenants);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar igrejas.' });
    }
});

// 5. Criar novo tenant (Super Admin)
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
