const pool = require("../config/db")

exports.listarDesafios = async(req,res) => {
    try {
        const [rows] = await pool.query("select * from desafios")
        res.json(rows)
    } catch (error) {
        res.status(500).json({message:"Erro ao listar desafios", error})
    }
}

exports.criarDesafios = async(req,res) => {
    try {
        const {nomeDesafio, frequencia} = req.body
        if (!nomeDesafio||!frequencia) {
            return res.status(400).json({message:"Campos obrigatórios"})
        }
        await pool.query("insert into desafios (nome_desafio,frequencia) values (?,?)",[nomeDesafio,frequencia]) 
        res.json({message:"Desafio criado com sucesso"})
    } catch (error) {
        res.status(500).json({message:"Erro ao criar desafios", error})
    }
}

