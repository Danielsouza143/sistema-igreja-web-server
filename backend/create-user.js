import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/user.model.js';
import Tenant from './models/tenant.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONGODB_URI = "mongodb+srv://silvasouzadaniel14_db_user:5Z1HIgrV9Qhng0G5@cluster0.9c4fxqv.mongodb.net/sistema-igreja?appName=Cluster0";

const createUser = async () => {
    const args = process.argv.slice(2);
    const username = args[0];
    const password = args[1];
    const name = args[2];
    const role = args[3];
    const tenantId = args[4];

    if (!username || !password || !name || !role || !tenantId) {
        console.error('Por favor, forneça todos os argumentos: <username> <password> <name> <role> <tenantId>');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado ao MongoDB');

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            console.error('Tenant não encontrado.');
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            username,
            password: hashedPassword,
            name,
            role,
            tenantId,
        });

        const savedUser = await newUser.save();
        console.log('Usuário criado com sucesso:');
        console.log(savedUser);

        await mongoose.disconnect();
        console.log('Desconectado do MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Erro ao criar o usuário:', error);
        process.exit(1);
    }
};

createUser();
