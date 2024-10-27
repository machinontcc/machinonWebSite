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
