import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { createLembrete, getMyLembretes, markAllAsRead } from '../controllers/lembretes.controller.js';

const router = Router();

router.get('/my', protect, getMyLembretes);
console.log('Lembretes /my route registered.');
router.post('/', protect, createLembrete);
router.post('/mark-all-as-read', protect, markAllAsRead);

export default router;
