        const express = require('express');
    const cors = require('cors');
    const app = express();

    app.use(cors());

    // Rota principal que responde "Olá"
    app.get('/', (req, res) => {
      res.send('O servidor de teste está funcionando!');
    });

    const PORT = process.env.PORT || 3000;
    const HOST = '0.0.0.0';

    app.listen(PORT, HOST, () => {
      console.log(`Servidor de TESTE rodando em http://${HOST}:${PORT}`);
    });
    