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

async function handleLogout() {
    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: "Você quer realmente sair?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sim, sair!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await firebase.auth().signOut(); // Realiza o logout
            localStorage.removeItem('uidUser'); // Remove o uid do localStorage
            localStorage.removeItem('userData'); // Remove os dados do usuário
            console.log("Usuário deslogado com sucesso!");
            window.location.href = '../index.html'; // Redireciona para a página inicial
        } catch (error) {
            console.error("Erro ao fazer logout: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'Ocorreu um erro ao tentar fazer logout. Tente novamente.'
            });
        }
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
});

