import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'O nome de usuário é obrigatório.'],
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'A senha é obrigatória.'],
        minlength: 6,
        select: false // Não retorna a senha em queries por padrão
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    mfaCode: String,
    mfaCodeExpires: Date,
    mfaVerified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Middleware (hook) para criptografar a senha ANTES de salvar
userSchema.pre('save', async function(next) {
    // Só executa se a senha foi modificada (ou é nova)
    if (!this.isModified('password')) return next();

    // Criptografa a senha com um custo de 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Método para comparar a senha enviada com a senha no banco de dados
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;