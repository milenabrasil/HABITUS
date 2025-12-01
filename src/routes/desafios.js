const express = require("express")
const router = express.Router()
const {listarDesafios,criarDesafios} = require("../controllers/desafioController")

router.get("/", listarDesafios)

router.post("/",criarDesafios)

module.exports = router