import mongoose from 'mongoose';
import User from './models/user.model.js';

// Mesma URI usada no server.js
const MONGODB_URI = "mongodb+srv://silvasouzadaniel14_db_user:5Z1HIgrV9Qhng0G5@cluster0.9c4fxqv.mongodb.net/sistema-igreja?appName=Cluster0";

const fixPassword = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado ao MongoDB...');

        // Busca o usuário pelo username que você mostrou no JSON
        const user = await User.findOne({ username: 'prgustavo' });
        
        if (user) {
            console.log(`Usuário encontrado: ${user.username}`);
            user.password = '123456'; // Define uma senha simples temporária
            await user.save(); // O Model vai criptografar isso corretamente UMA VEZ só
            console.log('SUCESSO: Senha redefinida para "123456". Tente logar agora.');
        } else {
            console.log('ERRO: Usuário "prgustavo" não encontrado.');
        }
        await mongoose.disconnect();
    } catch (error) { console.error('Erro:', error); }
};

fixPassword();