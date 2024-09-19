function openPopup() {
    document.getElementById('chatbot-popup').classList.remove('hidden');
}

function closePopup() {
    document.getElementById('chatbot-popup').classList.add('hidden');
}

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (userInput.trim()) {
        const messagesDiv = document.getElementById('messages');

        // Adicionar mensagem do usuário
        messagesDiv.innerHTML += `<div><strong>Você:</strong> ${userInput}</div>`;

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
            messagesDiv.innerHTML += `<div><strong>Suporte Machinon:</strong> ${data.response}</div>`;
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Rolagem automática para a última mensagem
        } 
        catch (error) 
        {
            console.error('Erro:', error);
            messagesDiv.innerHTML += `<div>Bot: Ocorreu um erro ao enviar a mensagem.</div>`;
        }
    }
}
