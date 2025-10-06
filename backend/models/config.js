import mongoose from 'mongoose';

// Este Schema vai armazenar todas as configurações globais do sistema.
// A ideia é ter apenas UM documento desta coleção no banco de dados.
const configSchema = new mongoose.Schema({
    // Usamos um identificador fixo para garantir que haja apenas um documento de configuração.
    // Isso facilita encontrar e atualizar as configurações.
    singleton: {
        type: String,
        default: 'main',
        unique: true,
        required: true,
    },
    // ADICIONADO: Seção para armazenar a identidade da igreja
    identidade: {
        nomeIgreja: {
            type: String,
            default: 'Nome da Igreja'
        },
        logoIgrejaUrl: {
            type: String,
            default: ''
        }
    },
    // ADICIONADO: Seção para armazenar as configurações de aparência
    aparencia: {
        theme: {
            type: String,
            default: 'light'
        },
        corPrimaria: {
            type: String,
            default: '#001f5d'
        }
    },
    utensilios_categorias: {
        type: [String],
        default: [
            'Eletrônicos',
            'Mobiliário',
            'Decoração',
            'Cozinha',
            'Limpeza'
        ]
    },
    eventos_categorias: {
        type: [String],
        default: [
            'Culto Especial',
            'Conferência',
            'Seminário',
            'Ação Social',
            'Reunião de Liderança'
        ]
    },
    financeiro_categorias: {
        entradas: {
            type: [String],
            default: ["Dízimo", "Oferta Geral", "Oferta de Missões", "Vendas", "Doação Específica"]
        },
        saidas: {
            type: [String],
            default: ["Aluguel", "Contas Fixas (Água, Luz, etc)", "Manutenção e Reparos", "Departamentos", "Ação Social", "Compras Gerais", "Eventos"]
        }
    }
});

export default mongoose.model('Config', configSchema);