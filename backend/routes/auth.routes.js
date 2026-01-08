import express from 'express';
import { login, getSetupStatus, setupSuperAdmin } from '../controllers/auth.controller.js';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Autentica o usuário e retorna um token
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/setup-status
// @desc    Verifica se o sistema já tem um administrador configurado
// @access  Public
router.get('/setup-status', getSetupStatus);
router.post('/setup-admin', setupSuperAdmin); // Rota para criar o primeiro super admin

export default router;