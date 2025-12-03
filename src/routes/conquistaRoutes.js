const express = require('express');
const router = express.Router();
const {listarCatalogoConquistas,listarConquistasDoUsuario} = require('../controllers/conquistaController');
const authMiddleware = require('../middleware/authMiddleware'); 

// Aplica autenticação a todas as rotas
router.use(authMiddleware);

// GET /api/conquistas/catalogo - Lista todas as conquistas possíveis (templates)
router.get('/catalogo',listarCatalogoConquistas);

// GET /api/conquistas/usuario - Lista as conquistas que o usuário logado já desbloqueou
router.get('/usuario',listarConquistasDoUsuario);

// Nota: A lógica de VERIFICAÇÃO e CONCESSÃO da conquista será chamada DENTRO do historicoController.js,
// após o usuário concluir um desafio, e não diretamente por uma rota do usuário.

module.exports = router;