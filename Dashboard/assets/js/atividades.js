async function fetchAtividades(status = null) { // Adicionando um parâmetro com valor padrão
    setFiltroButtonsEnabled(false);

    const atividadesContainer = document.getElementById('atividades-container');
    atividadesContainer.innerHTML = ''; // Limpa o container de atividades
    const userDataString = localStorage.getItem('userData');
    const userData = JSON.parse(userDataString);

    const atividadesRef = db.collection(`empresas/${userData.empresaId}/atividades`);

    try {
        let query = atividadesRef; // Começa com a referência inicial

        // Se um status foi fornecido, aplique o filtro
        if (status) {
            query = atividadesRef.where('status', '==', status);
        }

        const snapshot = await query.get();
        
        snapshot.forEach(doc => {
            const atividade = doc.data();
            const atividadesElement = document.createElement('div');
            atividadesElement.classList.add("bg-[#2a2a3c]", "p-4", "rounded-xl", "flex", "items-center", "mt-6", "justify-between");

            atividadesElement.innerHTML = `
            <div class='flex items-center space-x-4'>
                <div class="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center">
                    <i class="fas fa-tasks text-white text-lg"></i>
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-semibold">${atividade.titulo}</h3>
                    <p class="text-gray-300">${atividade.descricao}</p>
                    <p class="text-gray-400 text-sm">Status: <span class=' 
                    ${atividade.status === 'Concluída' ? 'text-green-500' : ''} 
                    ${atividade.status === 'Agendada' ? 'text-yellow-500' : ''} 
                    ${atividade.status === 'Cancelada' ? 'text-red-500' : ''}'>${atividade.status}</span></p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class='text-right'>
                    <h2 class="text-lg font-semibold">${atividade.data}</h2>
                </div>
                <button class="bg-blue-500 text-white px-4 py-2 rounded-lg" onclick="openEditModal('${doc.id}')">Editar</button>
            </div>
        `;


            atividadesContainer.appendChild(atividadesElement);
        });
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
    } finally {
        setFiltroButtonsEnabled(true);
    }
}

function openEditModal(atividadeId) {
    const userDataString = localStorage.getItem('userData');
    const userData = JSON.parse(userDataString);
    
    const atividadeRef = db.collection(`empresas/${userData.empresaId}/atividades`).doc(atividadeId);
    
    atividadeRef.get().then(doc => {
        if (doc.exists) {
            const atividade = doc.data();
            
            // Preenche os campos do modal
            document.getElementById('atividadeId').value = atividadeId; // Armazena o ID
            document.getElementById('editTitulo').value = atividade.titulo;
            document.getElementById('editDescricao').value = atividade.descricao;
            document.getElementById('editStatus').value = atividade.status;
            document.getElementById('editData').value = atividade.data;

            // Mostra o modal
            document.getElementById('editModal').classList.remove('hidden');
        } else {
            console.error("Nenhuma atividade encontrada com este ID.");
        }
    }).catch(error => {
        console.error("Erro ao buscar a atividade: ", error);
    });
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

document.getElementById('saveEditButton').addEventListener('click', async () => {
    const atividadeId = document.getElementById('atividadeId').value;
    const titulo = document.getElementById('editTitulo').value;
    const descricao = document.getElementById('editDescricao').value;
    const status = document.getElementById('editStatus').value;
    const data = document.getElementById('editData').value; // Data já está em 'dd-mm-yyyy'

    const userDataString = localStorage.getItem('userData');
    const userData = JSON.parse(userDataString);

    const atividadeRef = db.collection(`empresas/${userData.empresaId}/atividades`).doc(atividadeId);

    try {
        await atividadeRef.update({
            titulo: titulo,
            descricao: descricao,
            status: status,
            data: data // Salva no formato 'dd-mm-yyyy'
        });
        console.log("Atividade atualizada com sucesso!");
        await firebase.firestore().collection(`empresas/${userData.empresaId}/logs`).add({
            user: firebase.auth().currentUser.email,
            action: `Editou a atividade: ${atividadeId} || ${titulo}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });   
        closeEditModal(); // Chama a função para fechar o modal
        fetchAtividades(); // Recarrega as atividades
    } catch (error) {
        console.error("Erro ao atualizar a atividade: ", error);
    }
});


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
document.getElementById('editData').addEventListener('input', formatDateInput);



function setFiltroButtonsEnabled(enabled) {
    document.querySelectorAll(".filtro-atividade").forEach((button) => {
        button.disabled = !enabled; // Desabilita ou habilita o botão
    });
}

const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

// Inicializa as atividades ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    fetchAtividades();
});

// Adiciona evento de click para os botões de filtro
document.querySelectorAll(".filtro-atividade").forEach((button) => {
        button.addEventListener("click", (e) => {
            const btnTodas = document.getElementById('btn-todas');
            const btnConcluidas = document.getElementById('btn-concluidas');
            const btnAgendadas = document.getElementById('btn-agendadas');
    
            const status = e.target.getAttribute("data-status");
    
            // Remove a classe ativa de todos os botões e aplica a classe inativa
            [btnTodas, btnConcluidas, btnAgendadas].forEach((btn) => {
                btn.classList.remove('bg-blue-800');
                btn.classList.add('bg-gray-800'); // Adiciona classe inativa a todos
            });
    
            // Define a classe ativa e carrega as notificações com base no botão pressionado
            if (status === 'todas') {
                fetchAtividades(); // Carrega todas as notificações
                btnTodas.classList.remove('bg-gray-800'); // Remove a classe inativa
                btnTodas.classList.add('bg-blue-800'); // Adiciona a classe ativa
            } else if (status === 'agendadas') {
                fetchAtividades("Agendada"); // Carrega apenas notificações não lidas
                btnAgendadas.classList.remove('bg-gray-800'); // Remove a classe inativa
                btnAgendadas.classList.add('bg-blue-800'); // Adiciona a classe ativa
            } else if (status === 'concluidas') {
                fetchAtividades("Concluída"); // Carrega apenas notificações lidas
                btnConcluidas.classList.remove('bg-gray-800'); // Remove a classe inativa
                btnConcluidas.classList.add('bg-blue-800'); // Adiciona a classe ativa
            }
        });
});

