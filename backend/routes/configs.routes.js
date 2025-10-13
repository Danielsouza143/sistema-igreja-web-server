import express from 'express';
import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Importando os novos controladores
import {
    getConfig,
    updateConfig,
    uploadLogo,
    exportConfig,
    importConfig
} from '../controllers/configs.controller.js';

const router = express.Router();

// --- Configuração do Multer para upload do logo ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'logo');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Salva sempre com o mesmo nome para substituir o logo antigo
    cb(null, 'logo' + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- ROTAS PRINCIPAIS ---

// Rota para buscar TODAS as configurações
router.get('/', getConfig);

// Rota para ATUALIZAR uma ou mais configurações (aparência, categorias, etc.)
router.patch('/', updateConfig);

// Rota para fazer UPLOAD do logo e atualizar o nome da igreja
router.post('/upload-logo', upload.single('logo'), uploadLogo);


// --- ROTAS DE BACKUP E RESTAURAÇÃO ---

// Rota para EXPORTAR as configurações
router.get('/export', exportConfig);

// Rota para IMPORTAR as configurações
router.post('/import', importConfig);


export default router;