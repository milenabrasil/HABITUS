require("dotenv").config()
module.exports = {
    // IMPORTANTE: Use uma chave complexa e armazene isso em process.env.JWT_SECRET no futuro.
    secret: process.env.JWT_SECRET, 
    expiresIn: '8h' 
};