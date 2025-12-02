// src/config/jwt.js
module.exports = {
    // IMPORTANTE: Use uma chave complexa e armazene isso em process.env.JWT_SECRET no futuro.
    secret: "sua_chave_super_secreta_aqui_para_assinatura", 
    expiresIn: '8h' 
};