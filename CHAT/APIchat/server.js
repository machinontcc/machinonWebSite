const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/send-message', (req, res) => {
  const userMessage = req.body.message;

  // Aqui você pode implementar sua lógica de resposta
  let botResponse = 'Desculpe, não entendi sua mensagem.';

  if (userMessage.toLowerCase().includes('oi sou o roberto')) {
    botResponse = 'Ninguém te perguntou';
  } else if (userMessage.toLowerCase().includes('qual seu nome')) {
    botResponse = 'Eu sou o Nicolau, o chat bot da Machinon!';
  } 

  res.json({ response: botResponse });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
