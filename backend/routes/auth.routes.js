import express from 'express';
import { login, getSetupStatus, verifyMfa, getMfaStatus } from '../controllers/auth.controller.js';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Autentica o usuário e retorna um token
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/verify-mfa
// @desc    Verifica o código MFA do usuário
// @access  Public
router.post('/verify-mfa', verifyMfa);

// @route   GET /api/auth/mfa-status
// @desc    Verifica se o MFA é necessário para um usuário
// @access  Public
router.get('/mfa-status', getMfaStatus);

// @route   GET /api/auth/setup-status
// @desc    Verifica se o sistema já tem um administrador configurado
// @access  Public
router.get('/setup-status', getSetupStatus);

export default router;