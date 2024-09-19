function openPopup() {
    document.getElementById('chatbot-popup').classList.remove('hidden');
    sendInitialMessage();
}

function closePopup() {
    document.getElementById('chatbot-popup').classList.add('hidden');
    clearMessages();
}

function clearMessages() {
    const messages = document.getElementById('messages');
    messages.innerHTML = ''; // Limpa todo o conteúdo da área de mensagens
}

function sendInitialMessage() {
    const messages = document.getElementById('messages');
    const initialMessage = `<div><strong>Suporte: Olá, como podemos te ajudar?</strong></div>`; // Mensagem pré-programada
    messages.innerHTML += initialMessage;

  }

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (userInput.trim()) {
        const messagesDiv = document.getElementById('messages');

        // Adicionar mensagem do usuário
        messagesDiv.innerHTML += `<div>Você: ${userInput}</div>`;

        // Limpar o campo de entrada
        document.getElementById('user-input').value = '';

        try {
            // Enviar a mensagem para a API
            const response = await fetch('http://localhost:3000/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userInput }),
            });

            const data = await response.json();

            // Adicionar resposta do bot
            messagesDiv.innerHTML += `<div><strong>Suporte: ${data.response}</strong></div>`;
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Rolagem automática para a última mensagem
        } 
        catch (error) 
        {
            console.error('Erro:', error);
            messagesDiv.innerHTML += `<div>Bot: Ocorreu um erro ao enviar a mensagem.</div>`;
        }
    }
}
