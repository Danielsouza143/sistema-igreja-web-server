import express from 'express';
import Membro from '../models/membro.model.js';
import Tenant from '../models/tenant.model.js';
import { s3Upload } from '../utils/s3-upload.js';
import { logActivity } from '../utils/logActivity.js';

const router = express.Router();
const upload = s3Upload('membros-publico');

// GET /api/public-form/tenant/:id - Retorna dados básicos da igreja para o cabeçalho
router.get('/tenant/:id', async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.params.id).select('name config.logoUrl config.aparencia');
        if (!tenant) {
            return res.status(404).json({ message: 'Igreja não encontrada.' });
        }
        res.json({
            name: tenant.name,
            logoUrl: tenant.config?.logoUrl,
            aparencia: tenant.config?.aparencia
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados da igreja.', error: error.message });
    }
});

// POST /api/public-form/membros - Cadastro público de membro
router.post('/membros', upload.single('foto'), async (req, res) => {
    try {
        const { tenantId, ...dadosMembro } = req.body;

        // 1. Validação do Tenant
        if (!tenantId) {
            return res.status(400).json({ message: 'Identificador da igreja é obrigatório.' });
        }
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Igreja inválida ou não encontrada.' });
        }

        // 2. Validação de CPF duplicado (dentro do mesmo tenant)
        if (dadosMembro.cpf) {
            const cpfLimpo = dadosMembro.cpf.replace(/\D/g, '');
            const existe = await Membro.findOne({ cpf: cpfLimpo, tenantId: tenantId });
            if (existe) {
                return res.status(400).json({ message: 'Este CPF já está cadastrado nesta igreja.' });
            }
            dadosMembro.cpf = cpfLimpo;
        }

        // 3. Tratamento de Arquivo (Foto)
        if (req.file) {
            dadosMembro.foto = req.file.location;
        }

        // 4. Ajustes de Dados
        // Remove campos que não devem ser preenchidos publicamente (segurança)
        delete dadosMembro.status; // Entra como 'ativo' por padrão no model, ou podemos forçar 'pendente' se houver lógica de aprovação
        
        // Tratamento de Arrays e Booleanos vindos do FormData (strings)
        if (dadosMembro.dons && typeof dadosMembro.dons === 'string') {
            dadosMembro.dons = [dadosMembro.dons]; // Se vier apenas um
        }
        
        // Converte string 'true'/'false' ou 'sim'/'nao' se necessário, 
        // mas o model aceita strings em muitos campos (ex: batismoAguas: 'sim').
        // O campo eDizimista é Boolean.
        if (dadosMembro.eDizimista) {
            dadosMembro.eDizimista = dadosMembro.eDizimista === 'true' || dadosMembro.eDizimista === 'sim';
        }

        // Processamento de filhos (vem como string do FormData, precisa parsear ou estruturar)
        // No FormData complexo, pode vir como filhos[0][nome]. 
        // O middleware do Multer não processa nested objects deep automaticamente sem libs extras no body-parser extendido,
        // mas vamos assumir que o frontend enviará de forma simplificada ou faremos o parse manual se vier JSON stringified.
        // Simplificação: Se vier como JSON string no campo 'filhosJSON'
        if (req.body.filhosJSON) {
            try {
                dadosMembro.filhos = JSON.parse(req.body.filhosJSON);
            } catch (e) {
                console.error("Erro ao parsear filhos:", e);
            }
        }

        // 5. Criação do Membro
        const novoMembro = new Membro({
            ...dadosMembro,
            tenantId: tenantId,
            status: 'ativo', // Ou 'pendente' se desejar aprovação
            origemCadastro: 'publico' // Campo útil para auditoria
        });

        await novoMembro.save();

        // Log (Sem usuário logado, usamos 'SYSTEM' ou 'PUBLIC')
        // await logActivity({ _id: 'PUBLIC', username: 'Formulário Público' }, 'CREATE_MEMBRO_PUBLIC', `Novo cadastro público: ${novoMembro.nome}`);

        res.status(201).json({ message: 'Cadastro realizado com sucesso! Seja bem-vindo(a).', membroId: novoMembro._id });

    } catch (error) {
        console.error('Erro no cadastro público:', error);
        res.status(500).json({ message: 'Erro interno ao processar cadastro.', error: error.message });
    }
});

export default router;