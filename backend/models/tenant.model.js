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
    // --- NOVO: Identificação Fiscal ---
    tipoDocumento: {
        type: String,
        enum: ['CNPJ', 'CPF'],
        default: 'CNPJ'
    },
    cnpj: {
        type: String,
        trim: true,
        default: ''
    },
    // ----------------------------------
    telefone: {           
        type: String,
        trim: true,
        default: ''
    },
    email: {              
        type: String,
        trim: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    config: {
        theme: {
            primaryColor: { type: String, default: '#3498db' },
            secondaryColor: { type: String, default: '#2c3e50' },
        },
        aparencia: {
            theme: { type: String, default: 'light' },
            corPrimaria: { type: String, default: '#001f5d' },
            corSecundaria: { type: String, default: '#0033a0' }
        },
        logoUrl: { type: String, default: '' },
        timezone: { type: String, default: 'America/Sao_Paulo' },
        currency: { type: String, default: 'BRL' },
        completedOnboard: { type: Boolean, default: false },
        
        utensilios_categorias: { type: [String], default: [] },
        eventos_categorias: { type: [String], default: [] },
        financeiro_categorias: {
            entradas: { type: [String], default: [] },
            saidas: { type: [String], default: [] }
        }
    }
}, {
    timestamps: true 
});

const Tenant = mongoose.model('Tenant', TenantSchema);

export default Tenant;
