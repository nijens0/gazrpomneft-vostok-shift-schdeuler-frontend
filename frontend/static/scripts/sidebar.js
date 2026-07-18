const burgerButton = document.querySelector('.header-burger');
const sideMenu = document.querySelector(`.side-menu`);

burgerButton.addEventListener("click", async () => {
    sideMenu.classList.toggle('is-collapsed');
})