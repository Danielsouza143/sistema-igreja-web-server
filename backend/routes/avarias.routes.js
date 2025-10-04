import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar avarias' });
    }
});

export default router;