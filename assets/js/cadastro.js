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

                        await createNotification("Novo Funcionário Cadastrado", `O funcionário ${data.nome} foi adicionado com sucesso.`, empresa.id);

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

async function simulatePayment() {
    const db = firebase.firestore();
    const auth = firebase.auth();

    // Função para gerar código aleatório de convite
    async function generateUniqueCode() {
        const generateCode = () => Math.random().toString(36).substring(2, 10).toUpperCase(); // Código de 8 caracteres
        let uniqueCode;
        let exists = true;

        // Gera e verifica unicidade no Firestore
        while (exists) {
            uniqueCode = generateCode();
            const snapshot = await db.collection("empresas").where("codigoConvite", "==", uniqueCode).get();
            exists = !snapshot.empty; // Se snapshot for vazio, o código é único
        }
        return uniqueCode;
    }

    // Recupera dados do usuário e da empresa do localStorage e converte para objeto
    const userData = JSON.parse(localStorage.getItem("userData"));
    const empresaData = JSON.parse(localStorage.getItem("empresaData"));
    if (!userData || !empresaData) {
        alert("Dados do usuário ou da empresa não encontrados.");
        return;
    }

    try {
        // Passo 1: Cria um novo usuário no Auth usando email e senha
        let uid;
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.senha);
            uid = userCredential.user.uid;
        } catch (error) {
            console.error("Erro na criação de usuário:", error);
            alert("Erro ao criar usuário.");
            return;
        }

        // Passo 2: Criação da empresa com data de vencimento de 1 mês após a data de criação
        let empresaId;
        try {
            const dataCriacao = new Date();
            const dataVencimento = new Date(dataCriacao);
            dataVencimento.setMonth(dataCriacao.getMonth() + 1);

            const codigoConvite = await generateUniqueCode(); // Gera código único para a empresa

            const empresaRef = await db.collection("empresas").add({
                nome: empresaData.nome,
                dataCriacao: dataCriacao,
                dataVencimento: dataVencimento,
                telefone: empresaData.telefone,
                planoId: userData.plano,
                statusPagamento: "Ativo",
                cnpj: empresaData.cnpj,
                email: empresaData.email,
                endereco: empresaData.endereco,
                codigoConvite: codigoConvite
            });

            empresaId = empresaRef.id;
        } catch (error) {
            console.error("Erro na criação da empresa:", error);
            alert("Erro ao criar empresa.");
            return;
        }

        // Passo 3: Criar o usuário na coleção "users" e associá-lo à empresa
        try {
            await db.collection("users").doc(uid).set({
                empresaId: empresaId,
                email: userData.email,
                nome: userData.nome,
                telefone: userData.telefone,
                cargo: userData.cargo,
                isAdmin: true,
            });
        } catch (error) {
            console.error("Erro ao criar usuário na coleção 'users':", error);
            alert("Erro ao criar usuário na base de dados.");
            return;
        }

        // Passo 4: Registrar o pagamento e associá-lo ao usuário e à empresa
        let pagamentoId;
        try {
            const pagamentoRef = await db.collection("payments").add({
                userId: uid,
                empresaId: empresaId,
                plano: userData.plano,
                preco: localStorage.getItem("precoPlano"),
                paymentMethod: "credit_card",
                status: "aprovado",
                timestamp: new Date(),
            });

            pagamentoId = pagamentoRef.id;
        } catch (error) {
            console.error("Erro ao registrar pagamento:", error);
            alert("Erro ao registrar pagamento.");
            return;
        }

        // Atualizar o documento da empresa para adicionar o ID do pagamento
        try {
            const empresaRef = db.collection("empresas").doc(empresaId);
            await empresaRef.update({ pagamentoId: pagamentoId });
        } catch (error) {
            console.error("Erro ao atualizar empresa com ID do pagamento:", error);
            alert("Erro ao atualizar empresa com ID do pagamento.");
            return;
        }

        // Limpa o localStorage e redireciona para a página de confirmação
        localStorage.clear();
        window.location.href = 'cadConcluido.html';

    } catch (error) {
        console.error("Erro inesperado no processo de pagamento:", error);
        alert("Erro inesperado no pagamento.");
    }
}
