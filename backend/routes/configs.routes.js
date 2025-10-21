import express from 'express';
import { s3Upload } from '../utils/s3-upload.js';

// Importando os novos controladores
import {
    getConfig,
    updateConfig,
    uploadLogo,
    exportConfig,
    importConfig
} from '../controllers/configs.controller.js';

const router = express.Router();

// --- Configuração do Multer para upload do logo (agora para S3) ---
const upload = s3Upload('logo');

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