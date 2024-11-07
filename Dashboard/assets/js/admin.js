 // Carregar dados da empresa do localStorage
 const empresaData = JSON.parse(localStorage.getItem("empresaData"));

 planoEmpresa = '';
 if (empresaData.planoId == 'planoOuro') {
   planoEmpresa = 'Plano Ouro';
 } else if (empresaData.planoId == 'planoDiamante') {
   planoEmpresa = 'Plano Diamante';
 } else {
   planoEmpresa = 'Plano Platinum';
 }

 document.getElementById("empresaNome").textContent = empresaData.nome;
 document.getElementById("empresaCnpj").textContent = empresaData.cnpj;
 document.getElementById("empresaEndereco").textContent = empresaData.endereco;
 document.getElementById("empresaTelefone").textContent = empresaData.telefone;
 document.getElementById("empresaEmail").textContent = empresaData.email;
 document.getElementById("empresaPlano").textContent = planoEmpresa + " - Para mudar de plano, contate o suporte.";
 document.getElementById("empresaDataCriacao").textContent = new Date(empresaData.dataCriacao.seconds * 1000).toLocaleDateString();
 document.getElementById("empresaDataVencimento").textContent = new Date(empresaData.dataVencimento.seconds * 1000).toLocaleDateString();
 document.getElementById("empresaStatusPagamento").textContent = empresaData.statusPagamento;

 // Função para abrir o modal de edição
 function openEditModal() {
   document.getElementById("nome").value = empresaData.nome;
   document.getElementById("cnpj").value = empresaData.cnpj;
   document.getElementById("endereco").value = empresaData.endereco;
   document.getElementById("telefone").value = empresaData.telefone;
   document.getElementById("email").value = empresaData.email;

   // Exibir o modal
   document.getElementById("editModal").classList.remove("hidden");
 }

 // Função para fechar o modal de edição
 function closeEditModal() {
   document.getElementById("editModal").classList.add("hidden");
 }

 // Função para salvar as alterações da empresa
 document.getElementById("editForm").addEventListener("submit", function(event) {
   event.preventDefault();

   const updatedData = {
     nome: document.getElementById("nome").value,
     cnpj: document.getElementById("cnpj").value,
     endereco: document.getElementById("endereco").value,
     telefone: document.getElementById("telefone").value,
     email: document.getElementById("email").value
   };

   // Salvar dados no Firestore
   const userData = JSON.parse(localStorage.getItem("userData"));
   firebase.firestore().collection("empresas").doc(userData.empresaId).update(updatedData)
     .then(() => {
       Swal.fire("Sucesso", "Dados da empresa atualizados com sucesso!", "success");
       fetchEmpresaInfo();
       location.reload();
     })
     .catch((error) => {
       console.error("Erro ao atualizar os dados: ", error);
       Swal.fire("Erro", "Houve um erro ao atualizar os dados.", "error");
     });
 });

 const logsContainer = document.getElementById("logsContainer");
 const userData = JSON.parse(localStorage.getItem("userData"));

 firebase
   .firestore()
   .collection(`empresas/${userData.empresaId}/logs`)
   .limit(10)
   .get()
   .then((querySnapshot) => {
     // Limpa o container antes de adicionar os logs
     logsContainer.innerHTML = "";

     querySnapshot.forEach((doc) => {
       const logData = doc.data();

       // Criação do card do log
       const logCard = document.createElement("div");
       logCard.classList.add(
         "bg-[#1e1e2e]",
         "p-4",
         "rounded-lg",
         "shadow-md",
         "mb-4"
       );

       // Timestamp formatado
       const timestamp = document.createElement("p");
       timestamp.classList.add("text-sm", "text-gray-400");
       timestamp.textContent = logData.timestamp.toDate().toLocaleString();

       // Ação realizada
       const action = document.createElement("p");
       action.classList.add("text-white", "font-semibold", "mt-2");
       action.textContent = logData.action;

       // Usuário que realizou a ação
       const user = document.createElement("p");
       user.classList.add("text-sm", "text-gray-300", "mt-1");
       user.textContent = `Por: ${logData.user}`;

       // Adiciona elementos ao card e o card ao container
       logCard.appendChild(timestamp);
       logCard.appendChild(action);
       logCard.appendChild(user);
       logsContainer.appendChild(logCard);
     });
   })
   .catch((error) => {
     console.error("Erro ao buscar logs: ", error);
     logsContainer.innerHTML =
       "<p class='text-red-500'>Erro ao carregar logs.</p>";
   });