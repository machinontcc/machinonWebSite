async function fetchUser() {
    const userDataString = localStorage.getItem('userData');
    const userData = JSON.parse(userDataString);
    const empresaString = localStorage.getItem('empresaData');
    const empresaData = JSON.parse(empresaString);

    document.getElementById('userName').innerText = userData.nome;
    document.getElementById('userEmail').innerText = userData.email;
    document.getElementById('userPhone').innerText = userData.telefone;
    document.getElementById('userCargo').innerText = userData.cargo;
    document.getElementById('empresa').innerText = empresaData.nome;

    document.getElementById('editUserName').value = userData.nome;
    document.getElementById('editUserPhone').value = userData.telefone;
    document.getElementById('editUserCargo').value = userData.cargo;
}

const editButton = document.getElementById('editButton');
const editModal = document.getElementById('editModal');
const cancelButton = document.getElementById('cancelButton');

editButton.onclick = () => {
    editModal.classList.remove('hidden');
};

cancelButton.onclick = () => {
    editModal.classList.add('hidden');
};

function openChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('hidden');
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('hidden');
}


async function changePassword() {

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    const user = firebase.auth().currentUser;

    // Reautenticar o usuário
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    try {
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        closeChangePasswordModal();
        logoutAndRedirect(); // Logout e redirecionamento
    } catch (error) {
        console.error(error);
        alert('Erro ao alterar a senha: ' + error.message);
    }
    
}

function logoutAndRedirect() {
    firebase.auth().signOut().then(() => {
        // Redireciona para a página inicial após o logout
        window.location.href = '../../index.html'; // Altere para o caminho correto do seu index
    }).catch((error) => {
        console.error('Erro ao fazer logout:', error);
    });
}


document.getElementById('editForm').onsubmit = async (e) => {
    e.preventDefault(); // Evita o envio do formulário
    const updatedName = document.getElementById('editUserName').value;
    const updatedPhone = document.getElementById('editUserPhone').value;
    const updatedCargo = document.getElementById('editUserCargo').value;
    const userUid = localStorage.getItem('uidUser');

    const userRef =  firebase.firestore().collection(`users`).doc(userUid);

    try {
        await userRef.update({
            nome: updatedName,
            telefone: updatedPhone,
            cargo: updatedCargo
        });
        console.log("Edição atualizada com sucesso!");
    }
    catch (error) {
        console.error("Erro ao atualizar: ", error);
    }

    // Atualiza os dados no localStorage
    let userData = JSON.parse(localStorage.getItem('userData'));
    userData.nome = updatedName;
    userData.telefone = updatedPhone;
    userData.cargo = updatedCargo;
    localStorage.setItem('userData', JSON.stringify(userData));

    // Atualiza a exibição na página
    document.getElementById('userName').innerText = updatedName;
    document.getElementById('userPhone').innerText = updatedPhone;
    document.getElementById('userCargo').innerText = updatedCargo;

    // Fecha o modal
    editModal.classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', async () => {
    await fetchUser();
});