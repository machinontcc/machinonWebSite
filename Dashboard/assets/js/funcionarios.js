const userData = JSON.parse(localStorage.getItem("userData"));
      const isAdmin = userData.isAdmin;

      document.addEventListener("DOMContentLoaded", async () => {
        
        if (isAdmin) {
          document.getElementById("codigoConvite").classList.remove("hidden");

          // Pega o código da empresa do Firestore
          const empresaId = userData.empresaId;
          const empresaDoc = await db.collection("empresas").doc(empresaId).get();

          if (empresaDoc.exists) {
            const codigoConvite = empresaDoc.data().codigoConvite || "Não disponível";
            document.getElementById("codigoEmpresa").textContent = codigoConvite;
          }
        }

        await fetchFuncionarios();
      });


      async function fetchFuncionarios() {
        const funcionariosContainer = document.getElementById(
          "funcionarios-container"
        );
        const empresaId = userData.empresaId;

        // Obtém a lista de funcionários da empresa
        const querySnapshot = await firebase
          .firestore()
          .collection(`empresas/${empresaId}/funcionarios`)
          .get();

        funcionariosContainer.innerHTML = "";

        // Para cada documento na coleção de funcionários
        for (const doc of querySnapshot.docs) {
          const funcionario = doc.data();
          const funcionarioId = doc.id;
          const userId = funcionario.userId;

          // Obtém o documento do usuário correspondente pelo userId
          const userDoc = await firebase
            .firestore()
            .collection("users")
            .doc(userId)
            .get();

          // Verifica se o usuário existe antes de obter o nome e o cargo
          const nome = userDoc.exists
            ? userDoc.data().nome
            : "Nome não encontrado";
          const cargo = userDoc.exists
            ? userDoc.data().cargo
            : "Cargo não especificado";
          const status = funcionario.status || "Indefinido";
          const dataContratacao =
            funcionario.dataContratacao?.toDate().toLocaleDateString() ||
            "Data não especificada";

          // Cria o elemento visual do funcionário
          const funcionarioElement = document.createElement("div");
          funcionarioElement.className =
            "flex justify-between items-center p-4 bg-gray-800 rounded-lg";

          funcionarioElement.innerHTML = `
      <div>
        <h3 class="text-lg font-semibold">${nome}</h3>
        <p class="text-sm">Cargo: ${cargo}</p>
        <p class="text-sm">Data de Contratação: ${dataContratacao}</p>
        <p class="text-sm">Status: ${status}</p>
      </div>
      ${
        isAdmin
          ? `<button onclick="openEditModal('${funcionarioId}', '${userId}', '${nome}', '${cargo}', '${status}')" class="text-blue-400 hover:underline">Editar</button>`
          : ""
      }
    `;

          funcionariosContainer.appendChild(funcionarioElement);
        }
      }

      function openEditModal(funcionarioId, userId, nome, cargo, status) {
        document.getElementById("funcionarioId").value = funcionarioId;
        document.getElementById("userId").value = userId;
        document.getElementById("editNome").value = nome;
        document.getElementById("editCargo").value = cargo;
        document.getElementById("editStatus").value = status;
        document
          .getElementById("editFuncionarioModal")
          .classList.remove("hidden");
      }

      function closeEditModal() {
        document.getElementById("editFuncionarioModal").classList.add("hidden");
      }

      // Função para salvar a edição do funcionário
      document
        .getElementById("saveEditButton")
        .addEventListener("click", async () => {
          const funcionarioId = document.getElementById("funcionarioId").value;
          const userId = document.getElementById("userId").value;
          const cargo = document.getElementById("editCargo").value;
          const nome = document.getElementById("editNome").value;
          const status = document.getElementById("editStatus").value;

          // Atualiza o campo `cargo` na coleção `users`
          await firebase
            .firestore()
            .collection("users")
            .doc(userId)
            .update({ cargo, nome });

          // Atualiza o campo `status` na coleção `funcionarios`
          await db
            .collection(`empresas/${userData.empresaId}/funcionarios`)
            .doc(funcionarioId)
            .update({ status });

          await createNotification("Funcionário Editado", `O administrador ${userData.nome} editou com sucesso o funcionário ${nome}.`, userData.empresaId);
          await firebase.firestore().collection(`empresas/${userData.empresaId}/logs`).add({
            user: firebase.auth().currentUser.email,
            action: `Alterou o funcionário ${nome}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          closeEditModal();
          fetchFuncionarios();
        });