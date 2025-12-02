// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
// Importa a mesma chave secreta usada para assinar o token no authController
const jwtConfig = require('../config/jwt'); 
// OU se você preferiu usar process.env.JWT_SECRET diretamente no controller:
// const JWT_SECRET = process.env.JWT_SECRET || "segredo_local"; 
// E substitua jwtConfig.secret por JWT_SECRET abaixo.

module.exports = (req, res, next) => {
    // 1. Tenta extrair o token do cabeçalho de Autorização
    const authHeader = req.headers.authorization;

    // Checagem 1: Verifica se o cabeçalho existe e tem o formato "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: "Acesso negado. Token não fornecido ou formato inválido." 
        });
    }

    // 2. Extrai o token, removendo o prefixo "Bearer "
    const token = authHeader.split(' ')[1]; 
    
    // Checagem 2: Verifica e valida o token
    try {
        // Verifica o token usando a chave secreta
        const decoded = jwt.verify(token, jwtConfig.secret); // Use a chave correta
        
        // 3. Anexa o ID do usuário decodificado à requisição
        // Este é o 'id_usuario' que você usará nos seus controladores (req.userId)
        req.userId = decoded.id_usuario;

        // 4. Continua para a próxima função (o controlador de destino)
        next();

    } catch (err) {
        // Se o token for inválido, expirado, ou a chave secreta estiver errada
        if (err.name === 'TokenExpiredError') {
             return res.status(401).json({ message: "Token expirado. Por favor, faça login novamente." });
        }
        return res.status(401).json({ message: "Token inválido." });
    }
};