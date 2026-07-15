export function init() {
    const mainHeader = document.querySelector('.main-header');
    if (!mainHeader) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const dateElement = document.createElement('h2');
    dateElement.classList.add('current-date');
    dateElement.textContent = `Сегодня: ${formattedDate}`;

    mainHeader.after(dateElement);
    console.log("Главная страница инициализирована");
}