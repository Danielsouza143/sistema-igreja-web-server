import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
    singleton: {
        type: String,
        default: 'main',
        unique: true,
        required: true,
    },
    identidade: {
        nomeIgreja: { type: String, default: '' },
        logoIgrejaUrl: { type: String, default: '' },
        cnpj: { type: String, default: '' },
        telefone: { type: String, default: '' },
        endereco: { type: String, default: '' },
        email: { type: String, default: '' }
    },
    aparencia: {
        theme: { type: String, default: 'light' },
        corPrimaria: { type: String, default: '#001f5d' },
        corSecundaria: { type: String, default: '#0033a0' }
    },
    
    // --- NOVAS CONFIGURAÇÕES FINANCEIRAS AUTOMÁTICAS ---
    porcentagemSede: { type: Number, default: 10 },
    coresCategorias: { type: Object, default: {} }, 

    utensilios_categorias: {
        type: [String],
        default: ['Eletrônicos', 'Mobiliário', 'Decoração', 'Cozinha', 'Limpeza']
    },
    eventos_categorias: {
        type: [String],
        default: ['Culto Especial', 'Conferência', 'Seminário', 'Ação Social', 'Reunião de Liderança']
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
