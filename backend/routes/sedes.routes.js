import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { requireSedeAdmin } from '../middleware/tenant.middleware.js';
import { getFiliais, createFilial, updateFilial, getDashboardData, impersonateFilial } from '../controllers/sedes.controller.js';

const router = express.Router();

// @route   GET /api/sedes/filiais & POST /api/sedes/filiais
// @desc    Listar todas as filiais e Criar uma nova filial
// @access  Private (Admin de Sede)
router.route('/filiais')
    .get(getFiliais)
    .post(createFilial);

// @route   PUT /api/sedes/filiais/:id
// @desc    Atualizar uma filial
// @access  Private (Admin de Sede)
router.route('/filiais/:id')
    .put(updateFilial);

// @route   POST /api/sedes/filiais/:id/impersonate
// @desc    Gerar um token para entrar como admin da filial
// @access  Private (Admin de Sede)
router.route('/filiais/:id/impersonate')
    .post(impersonateFilial);

// @route   GET /api/sedes/dashboard
// @desc    Obter dados para o dashboard da Sede
// @access  Private (Admin de Sede)
router.route('/dashboard')
    .get(getDashboardData);

export default router;
