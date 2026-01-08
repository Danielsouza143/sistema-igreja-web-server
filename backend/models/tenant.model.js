import mongoose from 'mongoose';
const { Schema } = mongoose;

const TenantSchema = new Schema({
    name: {
        type: String,
        required: [true, 'O nome do tenant é obrigatório.'],
        trim: true
    },
    tenantType: {
        type: String,
        required: true,
        enum: ['sede', 'filial']
    },
    // Para filiais, armazena o ID da sede principal
    parentTenant: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active',
        index: true
    },
    cnpj: {
        type: String,
        trim: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    // Configurações personalizadas do tenant, a serem preenchidas no onboarding
    config: {
        theme: {
            primaryColor: { type: String, default: '#3498db' },
            secondaryColor: { type: String, default: '#2c3e50' },
        },
        // Nova estrutura de aparência compatível com o frontend atual
        aparencia: {
            theme: { type: String, default: 'light' },
            corPrimaria: { type: String, default: '#001f5d' },
            corSecundaria: { type: String, default: '#0033a0' }
        },
        logoUrl: { type: String, default: '' },
        timezone: { type: String, default: 'America/Sao_Paulo' },
        currency: { type: String, default: 'BRL' },
        completedOnboard: { type: Boolean, default: false },
        
        // Categorias personalizáveis
        utensilios_categorias: { type: [String], default: [] },
        eventos_categorias: { type: [String], default: [] },
        financeiro_categorias: {
            entradas: { type: [String], default: [] },
            saidas: { type: [String], default: [] }
        }
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

const Tenant = mongoose.model('Tenant', TenantSchema);

export default Tenant;
