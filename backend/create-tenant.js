import mongoose from 'mongoose';
import Tenant from './models/tenant.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONGODB_URI = "mongodb+srv://silvasouzadaniel14_db_user:5Z1HIgrV9Qhng0G5@cluster0.9c4fxqv.mongodb.net/sistema-igreja?appName=Cluster0";

const createTenant = async () => {
    const args = process.argv.slice(2);
    const name = args[0];
    const tenantType = args[1];
    const parentTenant = args[2];

    if (!name || !tenantType) {
        console.error('Por favor, forneça todos os argumentos: <name> <tenantType> [parentTenant]');
        process.exit(1);
    }

    if (tenantType !== 'sede' && tenantType !== 'filial') {
        console.error('O tenantType deve ser "sede" ou "filial".');
        process.exit(1);
    }

    if (tenantType === 'filial' && !parentTenant) {
        console.error('Para criar uma filial, você precisa fornecer o ID do parentTenant.');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado ao MongoDB');

        const newTenantData = {
            name,
            tenantType,
        };

        if (tenantType === 'filial') {
            newTenantData.parentTenant = parentTenant;
        }

        const newTenant = new Tenant(newTenantData);

        const savedTenant = await newTenant.save();
        console.log('Tenant criado com sucesso:');
        console.log(savedTenant);

        await mongoose.disconnect();
        console.log('Desconectado do MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Erro ao criar o tenant:', error);
        process.exit(1);
    }
};

createTenant();
