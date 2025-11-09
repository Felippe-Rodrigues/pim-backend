// 1. Importações
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const app = express();

    //... depois de const app = express();

    console.log("--- DEBUG: VERIFICANDO VARIÁVEIS DE AMBIENTE ---");
    console.log("MYSQLHOST:", process.env.MYSQLHOST);
    console.log("MYSQLUSER:", process.env.MYSQLUSER);
    console.log("MYSQLDATABASE:", process.env.MYSQLDATABASE);
    console.log("MYSQLPORT:", process.env.MYSQLPORT);
    console.log("A Senha do Banco foi recebida?:", process.env.MYSQLPASSWORD ? "Sim" : "NÃO!");
    console.log("-------------------------------------------------");

    // O resto do seu código continua abaixo...
    // app.use(cors());
    // app.use(express.json());
    // ...etc

// 2. Middlewares
app.use(cors());
app.use(express.json());

// 3. Configuração do Banco de Dados (lê as variáveis do Railway)
const dbConfig = {
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    server: process.env.MYSQLHOST,
    database: process.env.MYSQLDATABASE,
    port: parseInt(process.env.MYSQLPORT, 10),
    options: {
        trustServerCertificate: true
    }
};

// 4. Rotas da API

// Rota para testar se a API está viva
app.get('/', (req, res) => {
  res.send('API do PIM está online e funcionando!');
});

// Rota para buscar as Perguntas Frequentes
app.get('/faqs', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM faqs');
        res.status(200).json(result.recordset);
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
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('userEmailParam', sql.VarChar, userEmail)
            .query('SELECT * FROM chamados WHERE user_email = @userEmailParam ORDER BY created_at DESC');
        res.status(200).json(result.recordset);
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
        let pool = await sql.connect(dbConfig);
        const maxIdResult = await pool.request().query('SELECT MAX(id) as maxId FROM chamados');
        let nextId = 1;
        if (maxIdResult.recordset.length > 0 && maxIdResult.recordset[0].maxId) {
            nextId = maxIdResult.recordset[0].maxId + 1;
        }
        const simulatedResult = await pool.request()
            .input('categoryParam', sql.VarChar, category)
            .query('SELECT answer FROM simulated_answers WHERE category = @categoryParam');
        let aiAnswer = "Sua dúvida foi registrada. Nossa IA está analisando e responderá em breve.";
        if (simulatedResult.recordset.length > 0) {
            aiAnswer = simulatedResult.recordset[0].answer;
        }
        await pool.request()
            .input('idParam', sql.Int, nextId)
            .input('questionParam', sql.Text, question)
            .input('answerParam', sql.Text, aiAnswer)
            .input('categoryParamInsert', sql.VarChar, category)
            .input('userEmailParam', sql.VarChar, userEmail)
            .input('createdAtParam', sql.DateTime, new Date())
            .query('INSERT INTO chamados (id, question, answer, category, user_email, created_at) VALUES (@idParam, @questionParam, @answerParam, @categoryParamInsert, @userEmailParam, @createdAtParam)');
        res.status(201).json({ message: 'Chamado criado com sucesso!', id: nextId });
    } catch (error) {
        console.error('Erro ao criar chamado:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// 5. Iniciar o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});