// Função para lidar com o envio do formulário
async function handleSubmit(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    const formData = new FormData(event.target); // Obtém os dados do formulário
    const data = Object.fromEntries(formData.entries()); // Converte os dados para um objeto

    if (data.codigo && data.codigo.trim() !== '') {
        try {
            const empresasRef = db.collection('empresas'); // Referência à coleção de empresas
            const q = empresasRef.where('codigoConvite', '==', data.codigo); // Consulta para verificar o código de convite
            const querySnapshot = await q.get(); // Obtém os documentos correspondentes

            if (!querySnapshot.empty) {
                // O código de convite existe
                const empresa = querySnapshot.docs[0].data(); // Obtém os dados da empresa
                const empresaNome = empresa.nome || "Empresa não identificada"; // Obtém o nome da empresa ou define um padrão
                
                // Pergunta se o usuário realmente quer se vincular à empresa
                const confirmarVinculo = confirm(`Empresa encontrada: ${empresaNome}\n\nDeseja se vincular a esta empresa?`);
                
                if (confirmarVinculo) {
                    try {
                        const userCredential = await firebase.auth().createUserWithEmailAndPassword(data.email, data.senha);
                        const user = userCredential.user;

                        await db.collection('users').doc(user.uid).set({
                            nome: data.nome,
                            email: data.email,
                            empresaId: empresa.id,
                            telefone: data.telefone,
                            cargo: data.cargo,
                            isAdmin: false,
                            dataCriacao: firebase.firestore.Timestamp.now()
                        });

                        await db.collection(`empresas/${empresa.id}/funcionarios`).doc(user.uid).set({
                            dataContratacao: firebase.firestore.Timestamp.now(),
                            status: 'Ativo',
                            userId: user.uid
                        })

                        // Alerta personalizado usando SweetAlert
                        Swal.fire({
                            title: 'Cadastro realizado!',
                            text: `Você foi vinculado com sucesso à empresa: ${empresaNome}`,
                            icon: 'success',
                            confirmButtonText: 'OK'
                        }).then(() => {
                            window.location.href = '../index.html'; // Redireciona após confirmar
                        });

                    } catch (error) {
                        console.error('Erro ao criar usuário:', error);
                        alert('Erro ao criar o usuário. Por favor, tente novamente.');
                    }
                } else {
                    alert('Vinculação cancelada.');
                }

            } else {
                // Alerta personalizado usando SweetAlert
                Swal.fire({
                    title: 'Código inválido',
                    text: `Código de convite inválido. Por favor, verifique e tente novamente.`,
                    icon: 'error',
                    confirmButtonText: 'OK'
                })
            }
        } catch (error) {
            console.error('Erro ao verificar o código de convite:', error);
            alert('Ocorreu um erro ao verificar o código de convite. Tente novamente mais tarde.');
        }
    } else { 
        // Salva o objeto de dados no localStorage
        localStorage.setItem('userData', JSON.stringify(data));
        console.log(data);
        window.location.href = 'cadastroEmpresa.html';
    }
}


async function handleSubmitEmpresa(event) {
    event.preventDefault();

    // Obtém todos os dados do formulário
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries()); // Converte para um objeto

    // Salva o objeto de dados no localStorage
    localStorage.setItem('empresaData', JSON.stringify(data));
    console.log(data);
    window.location.href = 'pagamento.html';
}