export function init() {
    const mainHeader = document.querySelector('.main-header');
    const burgerButton = document.querySelector('.header-burger');
    const sideMenu = document.querySelector(`.side-menu`);
    const shiftSchedulesRedirectButton = document.querySelector('.shift-schedules-redirect');

    const today = new Date();
    const formattedDate = today.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const dateElement = document.createElement('h2');
    dateElement.classList.add('current-date');
    dateElement.textContent = `Сегодня: ${formattedDate}`;

    mainHeader.after(dateElement);
    console.log("Главная страница инициализирована");

    burgerButton.addEventListener("click", async () => {
        sideMenu.classList.toggle('is-collapsed');
    })

    shiftSchedulesRedirectButton.addEventListener("click", async () => {
        window.location.href = `/shift-schedules-page.html`
    })
}