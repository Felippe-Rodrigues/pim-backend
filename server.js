// 1. Importações
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

// 2. Middlewares
app.use(cors());
app.use(express.json());

        // 3. Configuração do Banco de Dados (usando as variáveis de ambiente explícitas)
    const pool = mysql.createPool({
        host: process.env.MYSQLHOST,
        user: process.env.MYSQLUSER,
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE,
        port: process.env.MYSQLPORT,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    

// 4. Rotas da API

// Rota para testar se a API está viva
app.get('/', (req, res) => {
  res.send('API do PIM está online e funcionando!');
});

// Rota para buscar as Perguntas Frequentes
app.get('/faqs', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM faqs');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar FAQs:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar FAQs.' });
    }
});

// Rota para buscar os chamados de um usuário
app.get('/chamados', async (req, res) => {
    const { userEmail } = req.query;
    if (!userEmail) {
        return res.status(400).json({ error: 'O e-mail do usuário é obrigatório.' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM chamados WHERE user_email = ? ORDER BY created_at DESC', [userEmail]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});
    
// Rota para criar um novo chamado
app.post('/chamados', async (req, res) => {
    const { question, category, userEmail } = req.body;
    if (!question || !category || !userEmail) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    try {
        // Busca a resposta simulada
        const [simulatedRows] = await pool.query('SELECT answer FROM simulated_answers WHERE category = ?', [category]);
        let aiAnswer = "Sua dúvida foi registrada. Nossa IA está analisando e responderá em breve.";
        if (simulatedRows.length > 0) {
            aiAnswer = simulatedRows[0].answer;
        }

        // Calcula o próximo ID
        const [maxIdRows] = await pool.query('SELECT MAX(id) as maxId FROM chamados');
        let nextId = 1;
        if (maxIdRows.length > 0 && maxIdRows[0].maxId) {
            nextId = maxIdRows[0].maxId + 1;
        }
        
        // Insere o novo chamado no banco de dados
        await pool.query(
            'INSERT INTO chamados (id, question, answer, category, user_email, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [nextId, question, aiAnswer, category, userEmail, new Date()]
        );
        
        res.status(201).json({ message: 'Chamado criado com sucesso!', id: nextId });
    } catch (error) {
        console.error('Erro ao criar chamado:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

    // 5. Iniciar o Servidor
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor final rodando na porta ${PORT}`);
    });
    