import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../middleware/tenant.middleware.js';
import { 
    getAllTenants, 
    createSede, 
    createFilial, 
    updateTenantStatus, 
    getGlobalStats, 
    getGlobalLogs, 
    impersonateSede, 
    impersonateFilial,
    getAllUsers,
    createGlobalUser,
    updateGlobalUser,
    deleteGlobalUser
} from '../controllers/admin.controller.js';

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Obter estatísticas globais
// @access  Private (Super Admin)
router.route('/stats').get(protect, requireSuperAdmin, getGlobalStats);

// @route   GET /api/admin/logs
// @desc    Obter logs globais
// @access  Private (Super Admin)
router.route('/logs').get(protect, requireSuperAdmin, getGlobalLogs);

// @route   GET /api/admin/tenants
// @desc    Listar todos os tenants
// @access  Private (Super Admin)
router.route('/tenants').get(protect, requireSuperAdmin, getAllTenants);

// @route   POST /api/admin/tenants/sede
// @desc    Criar uma nova Sede
// @access  Private (Super Admin)
router.route('/tenants/sede').post(protect, requireSuperAdmin, createSede);

// @route   POST /api/admin/tenants/filial
// @desc    Criar uma nova Filial
// @access  Private (Super Admin)
router.route('/tenants/filial').post(protect, requireSuperAdmin, createFilial);

// @route   PATCH /api/admin/tenants/:id/status
// @desc    Mudar o status de um tenant (active/suspended)
// @access  Private (Super Admin)
router.route('/tenants/:id/status').patch(protect, requireSuperAdmin, updateTenantStatus);

// @route   POST /api/admin/tenants/:id/impersonate
// @desc    Gerar um token para entrar como admin da Sede
// @access  Private (Super Admin)
router.route('/tenants/:id/impersonate').post(protect, requireSuperAdmin, impersonateSede);

// @route   POST /api/admin/filiais/:id/impersonate
// @desc    Gerar um token para entrar como admin da Filial
// @access  Private (Super Admin)
router.route('/filiais/:id/impersonate').post(protect, requireSuperAdmin, impersonateFilial);

// @route   GET /api/admin/users
// @desc    Listar todos os usuários globais
// @access  Private (Super Admin)
router.route('/users').get(protect, requireSuperAdmin, getAllUsers);

// @route   POST /api/admin/users
// @desc    Criar usuário globalmente
// @access  Private (Super Admin)
router.route('/users').post(protect, requireSuperAdmin, createGlobalUser);

// @route   PUT /api/admin/users/:id
// @desc    Atualizar usuário globalmente
// @access  Private (Super Admin)
router.route('/users/:id').put(protect, requireSuperAdmin, updateGlobalUser);

// @route   DELETE /api/admin/users/:id
// @desc    Deletar usuário globalmente
// @access  Private (Super Admin)
router.route('/users/:id').delete(protect, requireSuperAdmin, deleteGlobalUser);

export default router;