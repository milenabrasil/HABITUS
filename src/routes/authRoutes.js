const express = require('express');
const router = express.Router();
const {registerUser,loginUser,loginGoogle} = require('../controllers/authController');

// Rota de Cadastro de Novo Usuário (Sign Up)
router.post('/register',registerUser);

// Rota de Login Tradicional (Sign In)
router.post('/login',loginUser);

// Rota para futura implementação do Login com Google (Social Login)
router.post('/google',loginGoogle);

module.exports = router;