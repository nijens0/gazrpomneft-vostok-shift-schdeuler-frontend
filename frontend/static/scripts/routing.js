const mainContent = document.querySelector('.main');
const pageTitle = document.querySelector('.page-name');
const menuList = document.querySelector('.side-menu-list');

// Функция подсветки активного пункта меню
function updateActiveMenuItem(path) {
    document.querySelectorAll('.side-menu-element').forEach(el => el.classList.remove('is-active'));
    const activeLink = document.querySelector(`.side-menu-element[href="${path}"]`);
    if (activeLink) {
        activeLink.classList.add('is-active');
    }
}

async function route(url, title) {
    try {
        mainContent.style.opacity = '0';
        pageTitle.classList.add('page-name-hidden');

        // Стучимся во Flask на эндпоинт /get-page/имя_файла.html
        const response = await fetch(`/get-page/${url}`);
        const html = await response.text();

        setTimeout(async () => {
            mainContent.innerHTML = html;
            pageTitle.textContent = title;

            const scriptName = url.split('/').pop().replace('.html', '.js');

            // Префикс /static, так как папка scripts переехала туда
            const scriptPath = `/static/scripts/${scriptName}`;

            try {
                const module = await import(scriptPath);

                if (module.init) {
                    module.init();
                }
            } catch (err) {
                console.warn(`Скрипт ${scriptPath} не найден или содержит ошибки. ${err.message}`);
            }

            mainContent.style.opacity = '1';
            pageTitle.classList.remove('page-name-hidden');
        } , 200);

    } catch (error) {
        mainContent.innerHTML = `<h1>Ошибка загрузки</h1>`;
        pageTitle.classList.remove('page-name-hidden');
    }
}

menuList.addEventListener('click', async (event) => {
    const link = event.target.closest('.side-menu-element');

    if (link) {
        event.preventDefault();

        const path = link.getAttribute('href'); // например, 'employees-page.html'
        const sectionName = link.textContent.trim();

        if (path && path !== "") {
            window.history.pushState({ path, sectionName }, '', path);

            await route(path, sectionName);
            updateActiveMenuItem(path);
        }
    }
});

window.addEventListener('popstate', (event) => {
    if (event.state) {
        route(event.state.path, event.state.sectionName);
        updateActiveMenuItem(event.state.path); // Синхронизируем меню при клике "Назад" в браузере
    } else {
        location.reload();
    }
});

// ЛОГИКА ДЛЯ ОБРАБОТКИ ОБНОВЛЕНИЯ СТРАНИЦЫ (F5)
window.addEventListener('DOMContentLoaded', () => {
    // 1. Получаем путь из адресной строки (например, "/employees-page.html")
    let currentPath = window.location.pathname;

    // Убираем ведущий слэш, чтобы сопоставить с href в меню
    if (currentPath.startsWith('/')) {
        currentPath = currentPath.slice(1);
    }

    // 2. Если мы в корне или на index.html — грузим дефолтную главную страницу
    if (currentPath === '' || currentPath === 'index.html') {
        route('main-page.html', 'Главная');
        updateActiveMenuItem('main-page.html');
        return;
    }

    // 3. Ищем пункт меню, у которого href совпадает с текущим URL
    const associatedLink = document.querySelector(`.side-menu-element[href="${currentPath}"]`);

    if (associatedLink) {
        const sectionName = associatedLink.textContent.trim();

        // Подсвечиваем этот пункт и вызываем роут для него
        updateActiveMenuItem(currentPath);
        route(currentPath, sectionName);
    } else {
        // На случай, если в URL вбито то, чего нет в меню, просто сбрасываем на главную
        route('main-page.html', 'Главная');
        updateActiveMenuItem('main-page.html');
    }
});