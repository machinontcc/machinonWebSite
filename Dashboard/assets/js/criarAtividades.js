document.getElementById('createActivityButton').onclick = function() {
    const userString = localStorage.getItem('userData');
    const userData = JSON.parse(userString);
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
    const data = document.getElementById('data').value;
    
    // Aqui você deve adicionar a lógica para armazenar a atividade no Firestore, por exemplo.
    // firebase.firestore().collection('atividades').add({...});
    
    // Exibir mensagem de sucesso
    showAlert(`Atividade "${titulo}" criada com sucesso!`);
};


// Função para mostrar o alerta
function showAlert(message) {
    const alertModal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');
    alertMessage.innerText = message;
    alertModal.classList.remove('hidden');
}

// Função para fechar o alerta
function closeAlertModal() {
    const alertModal = document.getElementById('alertModal');
    alertModal.classList.add('hidden');
}

async function fetchUser() {
    const userString = localStorage.getItem('userData');
    const userData = JSON.parse(userString);

    const responsavel = userData.nome;
    const responsavelInput = document.getElementById('responsavel');

    responsavelInput.value = responsavel
  
}

// Função para formatar a entrada da data
function formatDateInput(event) {
    const input = event.target.value.replace(/[^0-9]/g, ''); // Remove caracteres não numéricos

    let formattedValue = '';
    for (let i = 0; i < input.length; i++) {
        // Adiciona traços automaticamente
        if (i === 2 || i === 4) {
            formattedValue += '-';
        }
        formattedValue += input[i];
    }

    // Limita o valor a 10 caracteres (dd-mm-yyyy)
    event.target.value = formattedValue.substring(0, 10);
}

// Adiciona o evento ao campo de data
document.getElementById('data').addEventListener('input', formatDateInput);

// Inicializa as atividades ao carregar a página
document.addEventListener("DOMContentLoaded", async () => {
    await fetchUser();
});
