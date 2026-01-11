import Membro from '../models/membro.model.js';
import Tenant from '../models/tenant.model.js';

export const getPublicMemberCard = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ message: 'Token não fornecido.' });
        }

        const membro = await Membro.findOne({ cardToken: token }).populate('tenantId');

        if (!membro) {
            return res.status(404).json({ message: 'Cartão não encontrado ou inválido.' });
        }

        // Verifica se o tenant (igreja) está ativo
        if (!membro.tenantId || membro.tenantId.status === 'suspended') {
            return res.status(403).json({ message: 'Acesso ao cartão temporariamente indisponível.' });
        }

        // Lógica de Sede/Filial para o nome da igreja
        let nomeIgreja = membro.tenantId.name;
        let logoUrl = membro.tenantId.config?.logoUrl;
        
        // Se for filial, tenta pegar o nome da sede principal para exibição (opcional, mas segue a lógica do cartão físico)
        // Nota: O populate acima pegou apenas o tenant direto. Se quiséssemos a sede da filial, precisaríamos de mais um populate.
        // Para a rota pública ser rápida, vamos usar os dados do tenant direto ou o que estiver disponível.
        
        // Se o tenant for filial e tiver config de aparencia herdada, isso seria tratado aqui.
        // Por simplificação e segurança, retornamos o nome do tenant onde o membro está cadastrado.

        // Retorna APENAS dados públicos necessários para o cartão
        const publicData = {
            nome: membro.nome,
            fotoUrl: membro.fotoUrl || membro.foto, // Fallback para compatibilidade
            cargo: membro.cargoEclesiastico || 'Membro',
            rg: membro.rg,
            cpf: membro.cpf, // Cuidado com LGPD, mas solicitado pelo usuário para o cartão
            dataNascimento: membro.dataNascimento,
            dataBatismo: membro.dataBatismo,
            estadoCivil: membro.estadoCivil,
            filiacao: membro.filiacao,
            dataCadastro: membro.dataCadastro,
            igreja: {
                nome: nomeIgreja,
                logoUrl: logoUrl,
                corPrimaria: membro.tenantId.config?.aparencia?.corPrimaria || '#1a2a4c',
                corSecundaria: membro.tenantId.config?.aparencia?.corSecundaria || '#f0a500'
            }
        };

        res.status(200).json(publicData);

    } catch (error) {
        console.error('Erro ao buscar cartão público:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};
