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
    try {
        await fetchUserInfo(); // Chama a função para buscar as informações do usuário
        await fetchEmpresaInfo();

        const userDataString = localStorage.getItem('userData'); // Obtém os dados do usuário do localStorage
        const empresaDataString = localStorage.getItem('empresaData'); // Obtém os dados da empresa

        if (userDataString && empresaDataString) { // Verifica se userDataString e empresaDataString não são null
            const userData = JSON.parse(userDataString); // Faz o parse para objeto
            const empresaData = JSON.parse(empresaDataString); // Faz o parse para objeto

            // Atualiza o texto do elemento com o id 'username' (verifique se o elemento existe no DOM)
            const usernameElement = document.getElementById('username');
            if (usernameElement) {
                usernameElement.innerText = `Olá, ${userData.nome}`;
            } else {
                console.warn("Elemento 'username' não encontrado.");
            }

            // Atualiza o título do elemento com o id 'titleSensores' (verifique se o elemento existe no DOM)
            const titleSensoresElement = document.getElementById('titleSensores');
            if (titleSensoresElement) {
                titleSensoresElement.innerText = `Sensores da Empresa: ${empresaData.nome}`;
            } else {
                console.warn("Elemento 'titleSensores' não encontrado.");
            }

            // Chama as funções de escuta
            listenToSensors();
            listenToAtividades();

        } else {
            console.warn("userDataString ou empresaDataString não encontrados no localStorage.");
            document.getElementById('username').innerText = 'Olá, Usuário'; // Valor padrão se os dados não existirem
        }
    } catch (error) {
        console.error("Erro ao carregar os dados:", error);
    }
});

