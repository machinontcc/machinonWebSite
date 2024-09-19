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

  if (userMessage.toLowerCase().includes('oi')) {
    botResponse = 'Olá! Como posso ajudar você?';
  } else if (userMessage.toLowerCase().includes('qual seu nome')) {
    botResponse = 'Eu sou um chatbot!';
  }

  res.json({ response: botResponse });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
