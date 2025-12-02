const express = require('express');
const router = express.Router();
const {buscarPerfil,atualizarPerfil,alterarSenha} = require('../controllers/usuariosController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Aplica o middleware de autenticação a todas as rotas de perfil
router.use(authMiddleware);

// 1. GET /api/usuarios/perfil
// Obtém todos os dados do perfil do usuário logado (nome, XP, foto, etc.)
router.get('/perfil',buscarPerfil);

// 2. PUT /api/usuarios/perfil
// Atualiza os dados básicos do usuário (nome, foto_url, etc.)
router.put('/perfil',atualizarPerfil);

// 3. PUT /api/usuarios/senha
// Rota para alterar a senha (requer a senha antiga)
router.put('/senha',alterarSenha);

module.exports = router;