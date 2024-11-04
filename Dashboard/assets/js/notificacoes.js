async function loadNotifications(status = null) {  
    console.log('Buscando notificacoes isRead:', status);
    const notificationsContainer = document.getElementById('notifications-container');
    notificationsContainer.innerHTML = ''; // Limpa o contêiner antes de carregar novas notificações
    const userData = JSON.parse(localStorage.getItem('userData'));

    const notificacoesRef = db.collection(`empresas/${userData.empresaId}/notificacoes`);

    try {
        let query = notificacoesRef;

        // Filtra por status de leitura se especificado
        if (status !== null) { 
            query = query.where('isRead', '==', status);
        }

        // Ordena por data decrescente (da mais recente para a mais antiga)
        query = query.orderBy('createdAt', 'desc');

        // Obtém os resultados da consulta
        const snapshot = await query.get();

        snapshot.forEach(doc => {
            const notificacao = doc.data();
            addNotification(notificacao, doc.id);
        });
    } catch (error) {
        console.error("Erro ao buscar notificacoes: ", error);
    }
}

function convertFirebaseTimestamp(timestamp) {
    return new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
}

function addNotification(notification, notificationId) {
    const notificationsContainer = document.getElementById('notifications-container');
    const isRead = notification.isRead;
    const isAlert = notification.isAlert; // Obtém o valor do campo isAlert

    // Definindo a borda com base no status de leitura
    const borderClass = isRead ? 'border-green-500' : 'border-red-500';
    const alertIcon = isAlert ? '<i class="uil uil-exclamation-triangle text-yellow-400 mr-1"></i>' : ''; // Ícone de alerta

    const buttonText = isRead ? 'Marcar como Não Lida' : 'Marcar como Lida';

    // Converte o Timestamp do Firebase para um objeto Date
    const createdAt = convertFirebaseTimestamp(notification.createdAt);

    // Formata o tempo
    const timeAgo = formatTimeAgo(createdAt);

    const notificationDiv = document.createElement('div');
    notificationDiv.id = `notification-${notificationId}`; // Adiciona um ID único
    notificationDiv.className = `flex justify-between items-center bg-gray-700 p-4 rounded-lg border-l-4 ${borderClass}`; // Aplica a classe de fundo

    notificationDiv.innerHTML = `
      <div>
        <p class="font-semibold">${alertIcon}${notification.titulo}</p> <!-- Adiciona ícone de alerta se necessário -->
        <p class="text-sm">${notification.mensagem}</p>
        <p class="text-xs text-gray-400">${timeAgo}</p> <!-- Tempo formatado aqui -->
      </div>
      <button class="${isAlert ? 'text-white' : 'text-blue-400'}" onclick="markAsRead('${notificationId}', ${isRead})">${buttonText}</button>
    `;

    notificationsContainer.appendChild(notificationDiv);
}



// Função para formatar a data
function formatTimeAgo(date) {
    const now = new Date();
    const secondsPast = (now.getTime() - date.getTime()) / 1000;

    if (secondsPast < 60) {
        return `${Math.floor(secondsPast)} segundo(s) atrás`;
    } else if (secondsPast < 3600) {
        return `${Math.floor(secondsPast / 60)} minuto(s) atrás`;
    } else if (secondsPast < 86400) {
        return `${Math.floor(secondsPast / 3600)} hora(s) atrás`;
    } else {
        return `${Math.floor(secondsPast / 86400)} dia(s) atrás`;
    }
}

// Função para marcar uma notificação como lida/não lida
async function markAsRead(notificationId, isRead) {
    const userData = JSON.parse(localStorage.getItem('userData'));

    try {
        await db.collection(`empresas/${userData.empresaId}/notificacoes`).doc(notificationId).update({
            isRead: !isRead // Inverte o estado
        });
        // Após atualizar, recarrega as notificações
        await loadNotifications();
    } catch (error) {
        console.error("Erro ao marcar como lida: ", error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadNotifications(); // Carrega as notificações ao iniciar
});

// Filtros de notificações
document.querySelectorAll(".filtro-notificacao").forEach((button) => {
    button.addEventListener("click", (e) => {
        const btnTodas = document.getElementById('btn-todas');
        const btnLidas = document.getElementById('btn-lidas');
        const btnNaoLidas = document.getElementById('btn-naoLidas');

        const status = e.target.getAttribute("data-status");

        // Remove a classe ativa de todos os botões e aplica a classe inativa
        [btnTodas, btnLidas, btnNaoLidas].forEach((btn) => {
            btn.classList.remove('bg-blue-800');
            btn.classList.add('bg-gray-800'); // Adiciona classe inativa a todos
        });

        // Define a classe ativa e carrega as notificações com base no botão pressionado
        if (status === 'todas') {
            loadNotifications(); // Carrega todas as notificações
            btnTodas.classList.remove('bg-gray-800'); // Remove a classe inativa
            btnTodas.classList.add('bg-blue-800'); // Adiciona a classe ativa
        } else if (status === 'false') {
            loadNotifications(false); // Carrega apenas notificações não lidas
            btnNaoLidas.classList.remove('bg-gray-800'); // Remove a classe inativa
            btnNaoLidas.classList.add('bg-blue-800'); // Adiciona a classe ativa
        } else if (status === 'true') {
            loadNotifications(true); // Carrega apenas notificações lidas
            btnLidas.classList.remove('bg-gray-800'); // Remove a classe inativa
            btnLidas.classList.add('bg-blue-800'); // Adiciona a classe ativa
        }
    });
});
