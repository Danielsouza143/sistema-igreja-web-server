const mongoose = require('mongoose');

const visitanteSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    telefone: { type: String, required: true },
    dataNascimento: { type: Date },
    genero: { type: String, enum: ['masculino', 'feminino'] },
    bairro: { type: String, required: true },
    evangelico: { type: String, enum: ['sim', 'nao'], default: 'nao' },
    comoConheceu: { type: String },
    dataPrimeiraVisita: { type: Date, default: Date.now }
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Para evitar erro de sobreposição ao reiniciar o servidor em modo de desenvolvimento
module.exports = mongoose.models.Visitante || mongoose.model('Visitante', visitanteSchema);