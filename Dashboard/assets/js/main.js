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


document.addEventListener('DOMContentLoaded', async () => {
    await isLogged();
});