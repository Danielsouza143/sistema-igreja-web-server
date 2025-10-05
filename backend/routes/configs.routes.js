import express from 'express';
import Config from '../models/config.js';
import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// --- Configuração do Multer para upload do logo ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = process.env.NODE_ENV === 'production' 
    ? '/app/uploads/logo' 
    : path.resolve(__dirname, '..', '..', 'uploads', 'logo');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, 'logo' + path.extname(file.originalname)); // Sempre sobrescreve o logo com o mesmo nome
  }
});
const upload = multer({ storage: storage });

// Rota para buscar TODAS as configurações
// O frontend usará isso para popular a página
router.get('/', async (req, res) => {
    try {
        // Encontra o único documento de configuração ou cria um novo se não existir
        let config = await Config.findOne({ singleton: 'main' });
        if (!config) {
            config = new Config();
            await config.save();
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar configurações', error });
    }
});

// Rota para SALVAR as configurações
// O frontend chama essa rota ao adicionar ou remover uma categoria
router.post('/', async (req, res) => {
    try {
        // Encontra e atualiza o documento de configuração.
        // O 'upsert: true' garante que, se o documento não for encontrado, ele será criado.
        const configAtualizada = await Config.findOneAndUpdate(
            { singleton: 'main' },
            req.body, // Salva todo o corpo da requisição
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json(configAtualizada);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao salvar configurações', error });
    }
});

router.post('/upload-logo', upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    // Retorna o caminho do arquivo para ser salvo no documento de config
    const filePath = `/uploads/logo/${req.file.filename}`;
    res.status(200).json({ filePath: filePath });
});

export default router;