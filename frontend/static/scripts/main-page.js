export function init() {
    const navContainer = document.querySelector(`.nav-container`);
    const shiftSchedulesRedirectButtons = document.querySelectorAll('.shift-schedules-redirect');

    const today = new Date();
    const formattedDate = today.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const dateElement = document.createElement('h1');
    dateElement.classList.add('current-date');
    dateElement.textContent = `Сегодня: ${formattedDate}`;

    navContainer.before(dateElement);


    shiftSchedulesRedirectButtons[0].addEventListener('click', () => {
        window.location.href = `/shift-schedules-page.html`
    })

    shiftSchedulesRedirectButtons[1].addEventListener('click', () => {
        window.location.href = `/agreement-page.html`
    })

    shiftSchedulesRedirectButtons[2].addEventListener('click', () => {
        window.location.href = `/vacations-page.html`
    })
}