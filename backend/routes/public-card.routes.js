import express from 'express';
import { getPublicMemberCard } from '../controllers/public-card.controller.js';

const router = express.Router();

// Rota pública: /api/public/member-card/:token
router.get('/member-card/:token', getPublicMemberCard);

export default router;
