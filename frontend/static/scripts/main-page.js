export function init() {
    const mainHeader = document.querySelector('.main-header');
    const shiftSchedulesRedirectButtons = document.querySelectorAll('.shift-schedules-redirect');

    const today = new Date();
    const formattedDate = today.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const dateElement = document.createElement('h2');
    dateElement.classList.add('current-date');
    dateElement.textContent = `Сегодня: ${formattedDate}`;

    mainHeader.after(dateElement);
    console.log("Главная страница инициализирована");


    shiftSchedulesRedirectButtons[0].addEventListener('click', () => {
        window.location.href = `/shift-schedules-page.html`
    })

    shiftSchedulesRedirectButtons[1].addEventListener('click', () => {
        window.location.href = `/agreement-page.html`
    })
}