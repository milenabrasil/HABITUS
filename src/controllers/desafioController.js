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

exports.deletarDesafios = async(req,res) => {
    try {
        const {id} = req.params
        const [result] = await pool.query("delete from desafios where id_desafio=?",[id])
        if (result.affectedRows===0) {
            return res.status(404).json({message:"Desafio não encontrado"})
        }
        res.json({message:"Desafio deletado com sucesso"})
    } catch (error) {
        res.status(500).json({message:"Erro ao deletar desafios", error})
    }
}