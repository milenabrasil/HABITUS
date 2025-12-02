// server.js (ou app.js) CORRIGIDO

const express = require("express")
const cors = require("cors")
require("dotenv").config()
const app = express()
app.use(cors())
app.use(express.json())

// --- ROTAS (Endpoints Corrigidos) ---

// Desafios (Ex: /desafios/catalogo, /desafios)
const desafiosRoutes = require("./routes/desafiosRoutes") // Mudei para 'desafiosRoutes.js'
app.use("/api/desafios", desafiosRoutes) 

// Auth (Ex: /auth/login, /auth/register)
const authRoutes = require("./routes/authRoutes") // Mudei para 'authRoutes.js'
app.use("/api/auth", authRoutes)

// Usuários (Ex: /usuarios/perfil)
const usuariosRoutes = require("./routes/usuariosRoutes") // Mudei para 'usuariosRoutes.js'
app.use("/api/usuarios", usuariosRoutes)

// Objetivos (Ex: /objetivos, /objetivos/123)
const objetivoRoutes = require("./routes/objetivoRoutes") // Mudei para 'objetivoRoutes.js'
app.use("/api/objetivos", objetivoRoutes) // CORREÇÃO: Usar '/api/objetivos'

// Histórico (Ex: /historico/concluir, /historico/diario)
const historicoRoutes = require("./routes/historicoRoutes") // Mudei para 'historicoRoutes.js'
app.use("/api/historico", historicoRoutes) // CORREÇÃO: Usar '/api/historico'

// Conquistas (Ex: /conquistas/usuario, /conquistas/catalogo)
const conquistaRoutes = require("./routes/conquistaRoutes") // Mudei para 'conquistaRoutes.js'
app.use("/api/conquistas", conquistaRoutes) // CORREÇÃO: Usar '/api/conquistas'

// --- INICIALIZAÇÃO ---

// Porta recomendada
const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))