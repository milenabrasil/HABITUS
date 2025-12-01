const express = require("express")
const router = express.Router()
const {listarDesafios,criarDesafios, deletarDesafios} = require("../controllers/desafioController")

router.get("/", listarDesafios)

router.post("/",criarDesafios)
router.delete("/:id",deletarDesafios)

module.exports = router