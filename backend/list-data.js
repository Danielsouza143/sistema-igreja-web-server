import mongoose from 'mongoose';
import User from './models/user.model.js';
import Tenant from './models/tenant.model.js';

// Mesma URI usada no server.js
const MONGODB_URI = "mongodb+srv://silvasouzadaniel14_db_user:5Z1HIgrV9Qhng0G5@cluster0.9c4fxqv.mongodb.net/sistema-igreja?appName=Cluster0";

const listData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado ao MongoDB para leitura...');

        console.log('\n--- TENANTS (IGREJAS/FILIAIS) ---');
        const tenants = await Tenant.find();
        if (tenants.length === 0) console.log('Nenhum tenant encontrado.');
        tenants.forEach(t => {
            console.log(`ID: ${t._id} | Nome: "${t.name}" | Tipo: ${t.tenantType}`);
        });

        console.log('\n--- USUÁRIOS ---');
        const users = await User.find();
        if (users.length === 0) console.log('Nenhum usuário encontrado.');
        users.forEach(u => {
            // Aspas adicionadas para revelar espaços em branco acidentais
            console.log(`ID: ${u._id} | Username: "${u.username}" | Role: ${u.role} | TenantID: ${u.tenantId}`);
        });

        await mongoose.disconnect();
        console.log('\nConexão fechada.');
    } catch (error) {
        console.error('Erro ao ler dados:', error);
    }
};

listData();