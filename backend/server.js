import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importando as rotas
import membrosRoutes from './routes/membros.routes.js';
import pequenosGruposRoutes from './routes/pequenos-grupos.routes.js';
import financeiroRoutes from './routes/financeiro.routes.js';
import eventosRoutes from './routes/eventos.routes.js';
import utensiliosRoutes from './routes/utensilios.routes.js';
import configsRoutes from './routes/configs.routes.js';
import usersRoutes from './routes/users.routes.js';
import Config from './models/config.js'; // CORREÇÃO: O nome do arquivo é config.js
import Membro from './models/membro.model.js'; // Importar o modelo de Membro
import authRoutes from './routes/auth.routes.js';
import logsRoutes from './routes/logs.routes.js';
import lembretesRoutes from './routes/lembretes.routes.js';
import presencasMembrosRoutes from './routes/presencas.membros.routes.js'; // Adicionado
import presencasVisitantesRoutes from './routes/presencas.visitantes.routes.js';
import emprestimosRoutes from './routes/emprestimos.routes.js';
import visitantesRoutes from './routes/visitantes.routes.js';
import { protect, isAdmin } from './middleware/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configuração de CORS
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());


// --- REGISTRO DAS ROTAS DA API ---
// Rota pública de login
app.use('/api/auth', authRoutes);


// Rota pública para checar CPF (usada no formulário de cadastro)
app.get('/api/membros/check-cpf/:cpf', async (req, res, next) => {
    try {
        const { cpf } = req.params;
        const { excludeId } = req.query; // ID do membro a ser excluído da busca (para edição)

        if (!cpf || cpf.length < 11) {
            return res.status(400).json({ exists: false, message: 'CPF inválido.' });
        }

        const query = { cpf: cpf };
        if (excludeId) {
            query._id = { $ne: excludeId }; // $ne = not equal
        }

        const membro = await Membro.findOne(query);
        res.status(200).json({ exists: !!membro });
    } catch (error) { next(error); }
});

// --- ADICIONADO: Rota pública para o cartão virtual ---
// Retorna apenas os dados essenciais e não sensíveis de um membro.
app.get('/api/public/membro/:id', async (req, res, next) => {
    try {
        const membro = await Membro.findById(req.params.id).select(
            'nome cargoEclesiastico foto dataCadastro dataConversao' // Apenas campos públicos
        );

        if (!membro) {
            return res.status(404).json({ message: 'Membro não encontrado.' });
        }
        res.status(200).json(membro);
    } catch (error) {
        next(error);
    }
});

// --- ADICIONADO: Rota pública para configurações de identidade ---
// Usada pelo cartão virtual e potencialmente outras páginas públicas.
app.get('/api/public/configs', async (req, res, next) => {
    try {
        const config = await Config.findOne({ singleton: 'main' }).select('identidade');
        if (!config) {
            return res.status(404).json({ message: 'Configurações não encontradas.' });
        }
        res.status(200).json(config);
    } catch (error) {
        next(error);
    }
});

// Rotas protegidas (requerem login)
app.use('/api/membros', protect, membrosRoutes);
app.use('/api/visitantes', protect, visitantesRoutes);
app.use('/api/pequenos-grupos', protect, pequenosGruposRoutes);
app.use('/api/presencas-visitantes', protect, presencasVisitantesRoutes);
app.use('/api/presencas-membros', protect, presencasMembrosRoutes); // Adicionado
app.use('/api/financeiro', protect, financeiroRoutes);
app.use('/api/eventos', protect, eventosRoutes);

// Rotas de Admin (requerem login e permissão de admin)
app.use('/api/configs', protect, isAdmin, configsRoutes);
app.use('/api/users', protect, isAdmin, usersRoutes);
app.use('/api/logs', protect, isAdmin, logsRoutes);
app.use('/api/lembretes', protect, isAdmin, lembretesRoutes);
app.use('/api/utensilios', protect, isAdmin, utensiliosRoutes); // Movido para rotas de admin
app.use('/api/emprestimos', protect, isAdmin, emprestimosRoutes);

// --- ROTAS ESTÁTICAS ---
// Configuração para servir arquivos estáticos (como imagens de perfil)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/comprovantes', express.static(path.join(__dirname, '../uploads/comprovantes')));
app.use('/uploads/logo', express.static(path.join(__dirname, '../uploads/logo')));

// --- ADICIONADO: Servir arquivos estáticos da raiz do projeto (CSS, JS, HTML) ---
// Esta deve ser uma das últimas rotas, para não interceptar as de API.
const rootDir = path.resolve(__dirname, '..');
app.use(express.static(rootDir));

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('--- ERRO NÃO TRATADO ---');
    console.error(err.stack);
    console.error('----------------------');

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Ocorreu um erro interno no servidor.';

    res.status(statusCode).json({ message });
});

// Conexão com o MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Conectado ao MongoDB');
        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Erro MongoDB:', err);
        process.exit(1);
    });
export default app;
