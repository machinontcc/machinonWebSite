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

async function isLogged() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../pages/login.html';
        } else {
            localStorage.setItem('uidUser', user.uid);
        }
    });
}

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

async function checkUnreadNotifications() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) return; // Verifica se há dados do usuário

    const notificationsRef = db.collection(`empresas/${userData.empresaId}/notificacoes`);

    try {
        const snapshot = await notificationsRef.where('isRead', '==', false).get();

        const hasUnreadNotifications = !snapshot.empty; // Verifica se há notificações não lidas

        const notificationIndicator = document.querySelector('.uil-bell em'); // Seleciona o em da sidebar
        if (hasUnreadNotifications) {
            notificationIndicator.style.display = 'block'; // Mostra o indicador se houver notificações não lidas
        } else {
            notificationIndicator.style.display = 'none'; // Esconde o indicador se não houver
        }
    } catch (error) {
        console.error("Erro ao verificar notificações: ", error);
    }
}

async function createNotification(titulo, mensagem, empresaId) {
    const notification = {
        titulo: titulo,
        mensagem: mensagem,
        createdAt: new Date(),
        isRead: false
    };

    try {
        await db.collection(`empresas/${empresaId}/notificacoes`).add(notification);
        console.log("Notificação criada com sucesso");
    } catch (error) {
        console.error("Erro ao criar notificação: ", error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await isLogged();
    await fetchUserInfo();
    await checkUnreadNotifications();
});