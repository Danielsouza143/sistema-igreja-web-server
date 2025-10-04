import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';
import User from './models/user.model.js';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const createAdmin = async () => {
    try {
        // Conectar ao banco de dados
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado ao MongoDB para criação do admin...');

        // Perguntar pelo nome de usuário
        rl.question('Digite o nome de usuário para o novo administrador: ', async (username) => {
            // Verificar se o usuário já existe
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                console.log('\nERRO: Um usuário com este nome já existe.');
                rl.close();
                await mongoose.disconnect();
                return;
            }

            // Perguntar pela senha
            rl.question('Digite a senha para o novo administrador: ', async (password) => {
                if (password.length < 6) {
                    console.log('\nERRO: A senha deve ter no mínimo 6 caracteres.');
                    rl.close();
                    await mongoose.disconnect();
                    return;
                }

                // Criar o novo usuário com a role 'admin'
                const newUser = new User({
                    username: username.toLowerCase(), // Padroniza o username para minúsculas
                    password: password, // A senha será criptografada automaticamente pelo model
                    role: 'admin'
                });

                await newUser.save();
                console.log(`\nSUCESSO! Administrador "${username}" criado.`);
                
                rl.close();
                await mongoose.disconnect();
                console.log('Desconectado do MongoDB.');
            });
        });
    } catch (error) {
        console.error('\nFalha ao conectar ou criar administrador:', error);
        process.exit(1);
    }
};

createAdmin();