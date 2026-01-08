import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { requireSedeAdmin, requireOperadorOrAdmin } from '../middleware/tenant.middleware.js';
import { completeOnboarding, getTenantStatus, getMyTenant } from '../controllers/tenants.controller.js';
import { s3Upload } from '../utils/s3-upload.js';

const router = express.Router();

const uploadLogo = s3Upload('logos', true).single('logo');

// @route   PATCH /api/tenants/onboarding
// @desc    Salva os dados de configuração do onboarding de um tenant Sede.
// @access  Private (Admin de Sede)
router.route('/onboarding').patch(protect, uploadLogo, completeOnboarding);


// @route   GET /api/tenants/status
// @desc    Obtém o status de configuração de um tenant (se o onboarding foi feito).
// @access  Private (Qualquer usuário logado de um tenant)
router.route('/status').get(protect, requireOperadorOrAdmin, getTenantStatus);

// @route   GET /api/tenants/me
// @desc    Obtém os dados completos do tenant do usuário logado.
// @access  Private (Qualquer usuário logado de um tenant)
router.route('/me').get(protect, requireOperadorOrAdmin, getMyTenant);


export default router;
