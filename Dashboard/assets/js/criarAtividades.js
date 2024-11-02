document.getElementById('createActivityButton').onclick = async function() {
    const userString = localStorage.getItem('userData');
    const userData = JSON.parse(userString);
    const userUid = localStorage.getItem('uidUser');
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
    const data = document.getElementById('data').value;
    
     // Verifique se todos os campos necessários estão preenchidos
     if (!titulo || !descricao || !data) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    // Adiciona um novo documento na coleção 'atividades'
    db.collection(`empresas/${userData.empresaId}/atividades`).add({
        titulo: titulo,
        descricao: descricao,
        data: data,
        responsavel: userUid,
        status: 'Agendada',
        createdAt: firebase.firestore.Timestamp.now()
    })
    .then(async function(docRef) {
        console.log("Documento escrito com ID: ", docRef.id);
        showAlertModal(`Atividade "${titulo}" criada com sucesso!`, true);
        await createNotification("Nova Atividade Adicionada", `A atividade ${titulo} foi adicionada com sucesso.`, userData.empresaId);
    })
    .catch(function(error) {
        console.error("Erro ao adicionar documento: ", error);
        showAlertModal("Erro ao criar atividade, tente novamente.", false);
    });
};


// Função para mostrar o alerta
function showAlertModal(message, isSuccess) {
    const modal = document.getElementById('alertModal');
    const title = modal.querySelector('h2');
    const messageElement = document.getElementById('alertMessage');

    if (isSuccess) {
        title.innerHTML = 'Atividade Criada <i class="fa-regular fa-circle-check"></i>';
        title.classList.remove('text-red-500'); // Caso esteja com a classe de erro
        title.classList.add('text-green-500'); // Altera a cor para verde em caso de sucesso
    } else {
        title.innerHTML = 'Erro ao Criar Atividade <i class="fa-solid fa-circle-xmark"></i>';
        title.classList.remove('text-green-500'); // Caso esteja com a classe de sucesso
        title.classList.add('text-red-500'); // Altera a cor para vermelho em caso de erro
    }

    messageElement.innerHTML = message;

    // Exibe o modal
    modal.classList.remove('hidden');
}

// Função para fechar o alerta
function closeAlertModal() {
    document.getElementById('titulo').value = '';
    document.getElementById('descricao').value = '';
    document.getElementById('data').value = '';
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
