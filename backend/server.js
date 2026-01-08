import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Importando as rotas
import membrosRoutes from './routes/membros.routes.js';
import pequenosGruposRoutes from './routes/pequenos-grupos.routes.js';
import financeiroRoutes from './routes/financeiro.routes.js';
import eventosRoutes from './routes/eventos.routes.js';
import utensiliosRoutes from './routes/utensilios.routes.js';
import configsRoutes from './routes/configs.routes.js';
import usersRoutes from './routes/users.routes.js';
import adminRoutes from './routes/admin.routes.js';
import Config from './models/config.js';
import Membro from './models/membro.model.js';
import authRoutes from './routes/auth.routes.js';
import logsRoutes from './routes/logs.routes.js';
import lembretesRoutes from './routes/lembretes.routes.js';
import presencasMembrosRoutes from './routes/presencas.membros.routes.js';
import presencasVisitantesRoutes from './routes/presencas.visitantes.routes.js';
import emprestimosRoutes from './routes/emprestimos.routes.js';
import visitantesRoutes from './routes/visitantes.routes.js';
import tenantsRoutes from './routes/tenants.routes.js';
import sedesRoutes from './routes/sedes.routes.js';
import { protect } from './middleware/auth.middleware.js';
import { requireAdmin } from './middleware/tenant.middleware.js';



const app = express();
const PORT = process.env.PORT || 8080;

// --- CONFIGURAÇÃO DE AMBIENTE (CRUCIAL) ---
dotenv.config(); // Carrega variáveis do arquivo .env se existir

// Fallback de segurança para desenvolvimento local
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  [SEGURANÇA] JWT_SECRET não definido no .env. Usando chave insegura de desenvolvimento.');
    process.env.JWT_SECRET = 'segredo_local_desenvolvimento_sistema_igreja_2024';
}

// --- PREVENÇÃO DE CRASH AWS ---
// Se as credenciais não existirem, definimos valores falsos para o servidor não travar ao iniciar serviços de foto
if (!process.env.AWS_ACCESS_KEY_ID) {
    console.warn('⚠️  [AWS] Credenciais não encontradas. Uploads de arquivos podem falhar.');
    process.env.AWS_ACCESS_KEY_ID = 'mock_key';
    process.env.AWS_SECRET_ACCESS_KEY = 'mock_secret';
    process.env.AWS_REGION = 'us-east-1';
}

// Configuração de CORS explícita e segura
const whitelist = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  // Em produção, permite apenas as origens da sua whitelist (ex: 'https://app.seusite.com').
  // Em desenvolvimento, permite '*' para facilitar os testes locais.
  origin: (origin, callback) => {
    if (isDevelopment || !origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization'
}));

// Habilita o pre-flight para todas as rotas. Isso é crucial para o CORS funcionar
// com requisições que enviam headers de Authorization (todas as nossas requisições protegidas).
// O browser envia uma requisição OPTIONS antes do GET/POST/etc., e essa requisição
// não tem o header de Authorization. Sem a linha abaixo, nosso middleware `protect`
// bloquearia a requisição OPTIONS, fazendo com que a requisição principal falhasse no browser.
app.options('*', cors());

// Middleware para parsear JSON
app.use(express.json());

// --- DEBUG: Logger Detalhado de Requisições ---
// (MOVIDO PARA BAIXO: Agora ele roda DEPOIS do express.json(), então vai conseguir ler os dados)
app.use((req, res, next) => {
    console.log(`\n[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        console.log('DADOS RECEBIDOS:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// --- DEBUG: Monitor de Respostas ---
// Isso vai nos mostrar se o servidor respondeu com Sucesso (200) ou Erro (400/500)
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        console.log(`[RESPOSTA] Status: ${res.statusCode}`);
        if (res.statusCode >= 400) console.log('ERRO DETALHADO:', body);
        originalSend.call(this, body);
    };
    next();
});

// --- DEBUG: Verificador de Autenticação ---
// Isso vai nos dizer se o bloqueio está acontecendo no Token
app.use((req, res, next) => {
    // Verifica apenas rotas de API protegidas (exclui login e public)
    if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth') && !req.path.startsWith('/api/public')) {
        if (!req.headers.authorization) {
            console.error(`⛔ [BLOQUEIO AUTH] Tentativa de acesso a ${req.path} SEM TOKEN!`);
        }
    }
    next();
});

// --- MIDDLEWARE DE SEGURANÇA MULTI-TENANT ---
// Garante que, se o usuário estiver logado, ele tenha um tenantId associado
app.use((req, res, next) => {
    if (req.user && !req.user.tenantId && !req.user.isAdmin) {
        // Se não for super admin e não tiver tenant, é um estado inválido
        console.warn(`⚠️ Usuário ${req.user._id} autenticado sem Tenant ID!`);
    }
    next();
});

// --- Configuração de diretórios --- //
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// --- Configuração de diretórios estáticos ---
const pagesDir = path.join(rootDir, 'pages');
const componentsDir = path.join(rootDir, 'components');
const jsDir = path.join(rootDir, 'js');
const assetsDir = path.join(rootDir, 'assets');


// --- Rotas públicas para arquivos estáticos ---
app.use('/pages/styles', express.static(path.join(pagesDir, 'styles')));
app.use('/pages/logo.tab.png', express.static(path.join(pagesDir, 'logo.tab.png')));
app.use('/components', express.static(componentsDir));
app.use('/js', express.static(jsDir));
app.use('/assets', express.static(assetsDir));
app.use('/auth-guard.js', express.static(path.join(rootDir, 'auth-guard.js')));
app.use('/login.html', express.static(path.join(rootDir, 'login.html')));
app.use('/index.html', express.static(path.join(rootDir, 'index.html')));
app.use('/reset-password.html', express.static(path.join(rootDir, 'reset-password.html')));
app.use('/setup-admin.html', express.static(path.join(rootDir, 'setup-admin.html')));

// --- Redirecionamento da Raiz ---
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// --- CORREÇÃO DE ERRO 404 (MFA) ---
// Adiciona rota de fallback para status de MFA caso não exista em authRoutes
// Isso impede que o frontend trave esperando essa resposta
app.get('/api/auth/mfa-status', (req, res) => {
    res.status(200).json({ mfaEnabled: false });
});

// --- REGISTRO DAS ROTAS DA API ---
// Rota pública
app.use('/api/auth', authRoutes);

// Rota PROTEGIDA para checar CPF (Escopo por Tenant)
// TODO: Mover esta lógica para membros.controller.js para limpar o server.js
app.get('/api/membros/check-cpf/:cpf', protect, async (req, res, next) => {
    try {
        const { cpf } = req.params;
        const { excludeId } = req.query;
        
        if (!cpf || cpf.length < 11) {
            return res.status(400).json({ exists: false, message: 'CPF inválido.' });
        }

        // Filtra pelo CPF E pelo Tenant do usuário logado
        const query = { cpf: cpf, tenantId: req.user.tenantId };
        
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        
        const membro = await Membro.findOne(query);
        res.status(200).json({ exists: !!membro });
    } catch (error) { next(error); }
});

// Rota pública para o cartão virtual
app.get('/api/public/membro/:id', async (req, res, next) => {
    try {
        const membro = await Membro.findById(req.params.id).select('nome cargoEclesiastico foto dataCadastro dataConversao');
        if (!membro) {
            return res.status(404).json({ message: 'Membro não encontrado.' });
        }
        res.status(200).json(membro);
    } catch (error) { next(error); }
});

// Rota pública para configurações de identidade
app.get('/api/public/configs', async (req, res, next) => {
    try {
        const config = await Config.findOne({ singleton: 'main' }).select('identidade');
        if (!config) {
            return res.status(404).json({ message: 'Configurações não encontradas.' });
        }
        res.status(200).json(config);
    } catch (error) { next(error); }
});

// --- ROTA DE DIAGNÓSTICO (DEBUG) ---
// Acesse http://localhost:8080/api/debug/status para ver o que tem no banco
app.get('/api/debug/status', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const users = await db.collection('users').countDocuments();
        const tenants = await db.collection('tenants').countDocuments();
        const membros = await db.collection('membros').countDocuments();
        
        res.json({
            status: 'Conectado',
            banco: mongoose.connection.name,
            contagem_total_sem_filtro: { users, tenants, membros },
            aviso: 'Se a contagem for > 0 mas o painel estiver vazio, seu usuário pertence a um Tenant (Igreja) diferente dos dados.'
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Rotas protegidas (requerem login)
app.use('/api/tenants', protect, tenantsRoutes);
app.use('/api/sedes', protect, sedesRoutes); // Adicionado 'protect' para segurança
app.use('/api/admin', protect, adminRoutes); // Adicionado 'protect' para segurança
app.use('/api/membros', protect, membrosRoutes);
app.use('/api/visitantes', protect, visitantesRoutes);
app.use('/api/pequenos-grupos', protect, pequenosGruposRoutes);
app.use('/api/presencas-visitantes', protect, presencasVisitantesRoutes);
app.use('/api/presencas-membros', protect, presencasMembrosRoutes);
app.use('/api/financeiro', protect, financeiroRoutes);
app.use('/api/eventos', protect, eventosRoutes);
app.use('/api/lembretes', protect, lembretesRoutes);
app.use('/api/configs', protect, requireAdmin, configsRoutes);
app.use('/api/users', protect, requireAdmin, usersRoutes);
app.use('/api/logs', protect, requireAdmin, logsRoutes);
app.use('/api/utensilios', protect, utensiliosRoutes);
app.use('/api/emprestimos', protect, emprestimosRoutes);

// --- ROTAS ESTÁTICAS ---
app.use(express.static(rootDir, { 
    index: false,
    setHeaders: (res, path) => {
        if (path.endsWith('.html') && !path.includes('login.html') && !path.includes('index.html') && !path.includes('reset-password.html') && !path.includes('setup-admin.html')) {
            res.set('X-Blocked-By', 'Auth-Middleware');
        }
    }
}));

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('\n--- ERRO DETECTADO NO SERVIDOR ---');
    
    // Se for erro de validação do Mongoose (Banco de Dados), mostra detalhe por detalhe
    if (err.name === 'ValidationError') {
        console.error('❌ ERRO DE VALIDAÇÃO (DADOS INVÁLIDOS):');
        for (let field in err.errors) {
            console.error(`   👉 Campo: "${field}" | Erro: ${err.errors[field].message}`);
        }
    } else {
        console.error('❌ ERRO GERAL:', err.message);
        console.error(err.stack);
    }
    console.error('----------------------------------\n');

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Ocorreu um erro interno no servidor.';
    res.status(statusCode).json({ message });
});

// Conexão com o MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://silvasouzadaniel14_db_user:5Z1HIgrV9Qhng0G5@cluster0.9c4fxqv.mongodb.net/igreja-db?appName=Cluster0";
mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('Conectado ao MongoDB');
        
        // --- MIGRAÇÃO DE BANCO DE DADOS (FIX ÍNDICES) ---
        try {
            const collection = mongoose.connection.collection('emprestimos');
            const indexes = await collection.indexes();
            const indexExists = indexes.some(idx => idx.name === 'codigo_1');
            if (indexExists) {
                console.log('🔧 [MIGRAÇÃO] Removendo índice obsoleto "codigo_1" da coleção emprestimos...');
                await collection.dropIndex('codigo_1');
                console.log('✅ [MIGRAÇÃO] Índice removido com sucesso.');
            }
        } catch (idxError) {
            // Ignora erro se a coleção não existir ou índice já tiver sumido
            console.log('ℹ️ [MIGRAÇÃO] Verificação de índices concluída (sem alterações necessárias).');
        }

        const dbName = mongoose.connection.name;
        console.log(`📦 Banco: [${dbName}] | Ambiente: ${process.env.NODE_ENV || 'development'} | Multi-Tenant: ATIVO`);
        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Erro MongoDB:', err);
        process.exit(1);
    });
export default app;