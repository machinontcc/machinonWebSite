async function fetchUserInfo() {
    const uidUser = localStorage.getItem('uidUser');

    if (uidUser) {
        await db.collection('users').doc(uidUser).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    // Converte userData em string JSON antes de armazenar
                    localStorage.setItem('userData', JSON.stringify(userData));
                    console.log('Informações carregadas com sucesso!');
                    console.log(userData);
                } else {
                    console.error("Nenhum documento encontrado com esse uid.");
                }

                fetchEmpresaInfo();
            })
            .catch((error) => {
                console.error("Erro ao buscar informações do usuário: ", error);
            });
    } else {
        console.error("Nenhum uid encontrado no localStorage.");
    }
}

async function fetchEmpresaInfo() {
    const userDataString = localStorage.getItem('userData')

    if (userDataString) { // Verifica se userDataString não é null
        const userData = JSON.parse(userDataString); // Faz o parse para objeto

        await db.collection('empresas').doc(userData.empresaId).get()
            .then((doc) => {
                if (doc.exists) {
                    const empresaData = doc.data();
                    // Converte userData em string JSON antes de armazenar
                    localStorage.setItem('empresaData', JSON.stringify(empresaData));
                    console.log('Informações da empresa carregadas com sucesso!');
                    console.log(empresaData);
                } else {
                    console.error("Nenhum documento encontrado com esse uid.");
                }
            })
            .catch((error) => {
                console.error("Erro ao buscar informações da empresa: ", error);
            });
    }
}



function listenToSensors() {
    const uidUser = localStorage.getItem('userData');
    const sensorContainer = document.getElementById('sensor-container');
    sensorContainer.innerHTML = '';

    if (!uidUser) {
        console.error("UID do usuário não encontrado no localStorage.");
        return;
    } else {
        const userData = JSON.parse(uidUser);

        db.collection('empresas').doc(userData.empresaId).collection('sensores')
            .onSnapshot((snapshot) => {
                sensorContainer.innerHTML = ''; // Limpa o container antes de atualizar

                snapshot.forEach(doc => {
                    const sensorData = doc.data();

                    // Cria um card para cada sensor com base nas informações do snapshot
                    const sensorCard = document.createElement('div');
                    sensorCard.className = "bg-[#1e1e2e] rounded-xl p-4 w-60 min-w-[15rem] text-white shadow-md";

                    sensorCard.innerHTML = `
                <h3 class="text-md">Sensor de: ${sensorData.tipo}</h3>
                <h2 class="text-gray-300 text-lg poppins-medium">Valor Atual: ${sensorData.ultimaLeitura} ${sensorData.unidade}</h2>
                <p class="text-gray-300">Localizado em: ${sensorData.localizacao}</p>
            `;

                    sensorContainer.appendChild(sensorCard); // Adiciona o card ao container
                });
            }, (error) => {
                console.error("Erro ao ouvir mudanças nos sensores: ", error);
            });
    }
}

function listenToAtividades() {
    const uidUser = localStorage.getItem('userData');
    const atividadesContainer = document.getElementById('atividades-container');
    atividadesContainer.innerHTML = '';

    if (!uidUser) {
        console.error("UID do usuário não encontrado no localStorage.");
        return;
    } else {
        const userData = JSON.parse(uidUser);

        db.collection('empresas').doc(userData.empresaId).collection('atividades')
            .onSnapshot((snapshot) => {
                atividadesContainer.innerHTML = ''; // Limpa o container antes de atualizar

                snapshot.forEach(doc => {
                    const sensorData = doc.data();

                    // Cria um card para cada sensor com base nas informações do snapshot
                    const sensorCard = document.createElement('div');
                    sensorCard.className = "p-4 mb-4 bg-[#2a2a3c] rounded-xl shadow-md text-white flex items-center space-x-4";

                    // Mostra um texto temporário enquanto buscamos o nome do usuário
                    sensorCard.innerHTML = `
                    <div class="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center">
                        <i class="fas fa-tasks text-white text-lg"></i>
                    </div>
                    <div class="flex items-center justify-between w-full px-4">
                        <div>
                            <h3 class="text-lg font-semibold">${sensorData.titulo}</h3>
                            <p class="text-gray-300">${sensorData.descricao}</p>
                            <p class="text-gray-300">Status: 
                                <span class="font-semibold ${sensorData.status === 'Concluída' ? 'text-green-500' : ''} ${sensorData.status === 'Agendada' ? 'text-orange-500' : ''}">
                                    ${sensorData.status}
                                </span>
                            </p>
                        </div>
                        <div>
                            <h2 class="text-lg font-semibold">${sensorData.data}</h2>
                        </div>
                    </div>
                    `;


                    atividadesContainer.appendChild(sensorCard); // Adiciona o card ao container
                });
            }, (error) => {
                console.error("Erro ao ouvir mudanças nas atividades: ", error);
            });
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    await fetchUserInfo(); // Chama a função para buscar as informações do usuário
    const userDataString = localStorage.getItem('userData'); // Obtém os dados do usuário do localStorage

    if (userDataString) { // Verifica se userDataString não é null
        const userData = JSON.parse(userDataString); // Faz o parse para objeto

        // Atualiza o texto do elemento com o id 'username'
        document.getElementById('username').innerText = `Olá, ${userData.nome}`;
    } else {
        // Caso não haja dados, você pode definir um valor padrão ou uma mensagem
        document.getElementById('username').innerText = 'Olá, Usuário';
    }

    listenToSensors();
    listenToAtividades();
});

