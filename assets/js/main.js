document.addEventListener("DOMContentLoaded", function () {
    const menuButton = document.getElementById('menu-button');

    if (menuButton) {
        menuButton.addEventListener('click', function () {
            const sidebar = document.getElementById('sidebar');
            const isOpen = sidebar.classList.contains('-translate-x-full');
            sidebar.classList.toggle('-translate-x-full', !isOpen);
            sidebar.classList.toggle('translate-x-0', isOpen);
        });
    }
});

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
