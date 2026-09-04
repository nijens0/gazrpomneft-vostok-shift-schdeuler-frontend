import {API_BASE_URL, API_ENDPOINTS} from "./api.js";
/* global XLSX */

const LAST_SCHEDULE_ID_KEY = 'last-schedule-id';
const DRAFT_STATE_KEY = 'schedule-generation-draft';
const DRAFT_SAVE_DEBOUNCE_MS = 400;

const ScheduleStatus = {
    PROCESSING: "processing",
    ERROR: "error",
    OPTIMAL: "optimal"
};

const MONTHS = [
    {name: "Январь", days: 31},
    {name: "Февраль", days: 28},
    {name: "Март", days: 31},
    {name: "Апрель", days: 30},
    {name: "Май", days: 31},
    {name: "Июнь", days: 30},
    {name: "Июль", days: 31},
    {name: "Август", days: 31},
    {name: "Сентябрь", days: 30},
    {name: "Октябрь", days: 31},
    {name: "Ноябрь", days: 30},
    {name: "Декабрь", days: 31}
];

const shiftColors = {
    'Я': 'var(--day-shift)', 'Яз': 'var(--day-shift)', 'Яп': 'var(--day-shift)', 'Яв': 'var(--day-shift)',
    'Н': 'var(--night-shift)', 'Нз': 'var(--night-shift)', 'Нп': 'var(--night-shift)', 'Нв': 'var(--night-shift)',
    'В': 'var(--rest-and-trips)', 'ЕО': 'var(--rest-and-trips)',
    'Д': 'var(--on-the-road-or-trips)',
    'От': 'var(--vacations)', 'До': 'var(--vacations)',
    'У': 'var(--special)', 'К': 'var(--special)', 'МВ': 'var(--special)'
};

const FIRST_COLUMNS = [
    {key: 'employee_name', label: 'ФИО', rowspan: 2},
    {key: 'role', label: 'ДОЛЖНОСТЬ', rowspan: 2},
    {key: 'tab_number', label: 'ТАБ. №', rowspan: 2},
    {key: 'work_method', label: 'МЕТОД <br>ВАХТЫ', rowspan: 2},
    {key: 'schedule', label: 'ГРАФИК ВЫХОДА НА РАБОТУ ПО ЧИСЛАМ МЕСЯЦА', colspan: 'month'},
    {key: 'total', label: 'ИТОГО ОТРАБОТАНО ЗА МЕСЯЦ', colspan: 5}
];

const SECOND_COLUMNS = [
    {key: 'total_hours', label: 'ЧАСОВ<br>ВСЕГО'},
    {key: 'night_hours', label: 'ЧАСОВ<br>НОЧНЫХ'},
    {key: 'work_days', label: 'ДНЕЙ'},
    {key: 'travel_days', label: 'ДНЕЙ В<br>ПУТИ'},
    {key: 'fake_days', label: 'МВ'}
];


class MonthlyScheduleInfo {
    constructor(data) {
        this.department_name = data.department_name;
        this.facility_name = data.facility_name;
        this.month = data.month;
        this.roles = {};

        if (data.roles) {
            for (const [roleName, rawEmployeesArray] of Object.entries(data.roles)) {
                this.roles[roleName] = rawEmployeesArray.map(emp => new Employee(emp));
            }
        }

        this.schedule_id = data.schedule_id;
        this.year = data.year;
    }
}

class Employee {
    constructor(data) {
        this.employee_name = data.employee_name;
        this.fake_days = data.fake_days;
        this.night_hours = data.night_hours;
        this.rank = data.rank;
        this.row_1_shift = data.row_1_shift;
        this.row_2_day_hours = data.row_2_day_hours;
        this.row_3_night_hours = data.row_3_night_hours;
        this.tab_number = data.tab_number;
        this.total_hours = data.total_hours;
        this.travel_days = data.travel_days;
        this.work_days = data.work_days;
        this.work_method = data.work_method;
    }

}

const DOM = {
    get loader() {
        return document.getElementById('loader');
    },
    get overlay() {
        return document.getElementById('loading-overlay');
    },
    get selectorsContainer() {
        return document.querySelector('.selectors');
    },
    get allSelectors() {
        return document.querySelectorAll('.selector');
    },
    get tableContainer() {
        return document.querySelector('.table-container');
    },
    get tableHead() {
        return document.querySelector('.table thead');
    },
    get toolbar() {
        return document.querySelector('.toolbar');
    },
    get buttonsContainer() {
        return document.querySelector('.buttons');
    },
    get btnImport() {
        return document.querySelector('.import');
    },
    get btnExport() {
        return document.querySelector('.export');
    },
    get btnSchedules() {
        return document.querySelector('.schedules');
    },
    get btnGenerate() {
        return document.querySelector('.generate');
    },
    get btnNewSchedule() {
        return document.querySelector('.new-schedule');
    },
    get content() {
        return document.querySelector('.content')
    }
};

function showLoadingSpinner() {
    DOM.btnGenerate.disabled = true;
    DOM.btnGenerate.innerHTML = 'Генерация...';
    DOM.loader.classList.remove('hidden');
}

function hideLoadingSpinner() {
    DOM.btnGenerate.disabled = false;
    DOM.btnGenerate.innerHTML = 'Новый график';
    DOM.loader.classList.add('hidden');
}

function blockUI() {
    DOM.overlay.classList.remove('hidden');
}

function unblockUI() {
    DOM.overlay.classList.add('hidden');
}

function clearTable() {
    const tbody = document.querySelector('.table tbody');
    if (tbody) tbody.innerHTML = '';
}

async function generateSchedule(requestBody) {
    blockUI();

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.generateSchedule}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`Ошибка генерации: ${response.status}`);
    }

    return await response.json();
}

async function getTableData(scheduleId, month) {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getSchedule(scheduleId, month)}`);

        if (!response.ok) {
            throw new Error(`Ошибка сервера ${response.status}`);
        }

        const rawData = await response.json();

        return new MonthlyScheduleInfo(rawData);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

function renderTable(monthlyScheduleInfo, month) {
    const tableContainer = renderTableContainer();
    const thead = tableContainer.querySelector('thead');
    const tbody = tableContainer.querySelector('tbody');

    renderTableHead(month, thead);

    for (const [roleName, employees] of Object.entries(monthlyScheduleInfo.roles)) {
        employees.forEach(employee => {
            const rows = renderEmployeeRows(employee, roleName);
            tbody.append(...rows);
        });
    }

    // Вставляем свежесозданный контейнер в DOM — стили (.table-container:
    // border-radius, overflow, скролл) завязаны именно на этот класс,
    // поэтому таблица должна реально быть в документе, а не только создана в памяти.
    const existingContainer = DOM.tableContainer;
    if (existingContainer) {
        existingContainer.replaceWith(tableContainer);
    } else {
        (DOM.toolbar ?? DOM.selectorsContainer)?.after(tableContainer);
    }

    return tableContainer;
}

function buildShiftCells(employee) {
    let symbols = '';
    let dayHours = '';
    let nightHours = '';

    for (let i = 0; i <= 30; i++) {
        const shiftVal = employee.row_1_shift[i] || '';
        const bgColor = shiftColors[shiftVal] || 'transparent';

        symbols += `<td style="background-color: ${bgColor}">${employee.row_1_shift[i] ?? ""}</td>`;
        dayHours += `<td class="cell-center">${employee.row_2_day_hours[i] ?? ""}</td>`;
        nightHours += `<td class="cell-center">${employee.row_3_night_hours[i] ?? ""}</td>`;
    }

    return {symbols, dayHours, nightHours};
}

function renderTableContainer() {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'table schedules';

    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    table.append(thead, tbody);
    tableContainer.append(table);

    return tableContainer;
}

function renderEmployeeRows(employee, roleName) {
    const row1 = document.createElement('tr');
    const row2 = document.createElement('tr');
    const row3 = document.createElement('tr');

    const {symbols, dayHours, nightHours} = buildShiftCells(employee);

    row1.innerHTML = `
        <td rowspan="3" class="sticky-col">${employee.employee_name}</td>
        <td rowspan="3">${roleName}</td>
        <td rowspan="3">${employee.rank ?? ""}</td>
        <td rowspan="3">${employee.tab_number}</td>
        <td rowspan="3">${employee.work_method}</td>
        ${symbols}
        <td rowspan="3">${employee.total_hours}</td>
        <td rowspan="3">${employee.night_hours}</td>
        <td rowspan="3">${employee.work_days}</td>
        <td rowspan="3">${employee.travel_days}</td>
        <td rowspan="3">${employee.fake_days}</td>
    `;
    row2.innerHTML = dayHours;
    row3.innerHTML = nightHours;

    return [row1, row2, row3];
}

function renderTableHead(month, theadEl) {
    const tr1 = document.createElement('tr');
    const tr2 = document.createElement('tr');

    FIRST_COLUMNS.forEach(column => {
        const th = document.createElement('th');
        if (column.rowspan) th.rowSpan = column.rowspan;
        if (column.colspan) th.colSpan = column.colspan === 'month' ? month.days : column.colspan;

        th.innerHTML = column.label;
        tr1.append(th);
    });

    for (let day = 1; day <= month.days; day++) {
        const th = document.createElement('th');

        th.textContent = String(day);
        tr2.append(th);
    }
    SECOND_COLUMNS.forEach(column => {
        const th = document.createElement('th');

        th.innerHTML = column.label;
        tr2.append(th);
    });

    theadEl.append(tr1, tr2);
}


async function setGenerateScheduleSelectors() {
    const selectorsContainer = DOM.selectorsContainer;

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getFacilities}`);

        if (!response.ok) {
            throw new Error(`Ошибка загрузки промыслов: ${response.status}`);
        }

        const json = await response.json();

        const facilitiesSelector = document.createElement('select');
        facilitiesSelector.classList.add('selector');
        facilitiesSelector.ariaLabel = 'Промысел';
        facilitiesSelector.required = true;

        const defaultFacOption = document.createElement('option');
        facilitiesSelector.appendChild(defaultFacOption);
        defaultFacOption.value = '';
        defaultFacOption.text = 'Промысел';
        defaultFacOption.selected = true;
        defaultFacOption.disabled = true;

        json.forEach(facility => {
            const option = document.createElement('option');
            option.value = facility.facility_id;
            option.text = facility.short_name || facility.facility_name;
            facilitiesSelector.appendChild(option);
        });

        const departmentsSelector = document.createElement('select');
        departmentsSelector.classList.add('selector');
        departmentsSelector.ariaLabel = 'Участок';
        departmentsSelector.required = true;
        departmentsSelector.disabled = true;

        const defaultDeptOption = document.createElement('option');
        departmentsSelector.appendChild(defaultDeptOption);
        defaultDeptOption.value = '';
        defaultDeptOption.text = 'Участок';
        defaultDeptOption.selected = true;
        defaultDeptOption.disabled = true;

        selectorsContainer.innerHTML = '';
        selectorsContainer.append(facilitiesSelector, departmentsSelector);

        facilitiesSelector.addEventListener('change', async () => {
            facilitiesSelector.title = facilitiesSelector.selectedOptions[0].text;

            const facilityId = facilitiesSelector.value;
            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getDepartments(facilityId)}`);
            const facilityDepartments = await response.json();
            console.log(facilityDepartments);

            departmentsSelector.disabled = false;

            if (facilityDepartments.length !== 0) {
                departmentsSelector.options.length = 0;
                departmentsSelector.append(defaultDeptOption);

                facilityDepartments.forEach(facilityDepartment => {
                    const label = facilityDepartment.short_name || facilityDepartment.department_name || 'Без названия';
                    const id = facilityDepartment.department_id

                    departmentsSelector.add(new Option(label, id))
                });
            }
        });

        departmentsSelector.addEventListener('change', () => {
            departmentsSelector.title = departmentsSelector.selectedOptions[0].text;
        })

    } catch (error) {
        console.error('Не удалось загрузить промыслы:', error);
    }
}

async function setChooseScheduleSelectors() {
    const selectorsContainer = DOM.selectorsContainer;

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getSchedules}`);

        if (!response.ok) {
            throw new Error(`Ошибка получения расписаний ${response.status}`);
        }

        const json = await response.json();

        const schedulesSelector = document.createElement('select');
        schedulesSelector.classList.add('selector');
        schedulesSelector.ariaLabel = 'Графики';
        json.forEach(schedule => {
            const option = document.createElement('option');
            option.value = schedule.id;
            option.text = schedule.name;
            schedulesSelector.append(option);
        });

        const monthSelector = document.createElement('select');
        monthSelector.classList.add('selector');
        monthSelector.ariaLabel = 'Месяц';
        MONTHS.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = String(index + 1);
            option.text = month.name;
            monthSelector.append(option);
        });

        selectorsContainer.innerHTML = '';
        selectorsContainer.append(schedulesSelector, monthSelector);
        await attachSelectorListenersToRenderTable()
    } catch (error) {
        console.error('Не удалось загрузить графики:', error);
        throw new Error(error);
    }
}

function setChooseScheduleButtons() {
    const buttonsContainer = DOM.buttonsContainer;

    buttonsContainer.innerHTML = `
        <button class="toolbar-button import">
            <img class="toolbar-icon" src="/static/icons/download.svg" alt="Иконка импорта"/>
            Импорт из Excel
        </button>
        <button class="toolbar-button export">
            <img class="toolbar-icon" src="/static/icons/export.svg" alt="Иконка экспорта"/>
            Экспорт в Excel
        </button>
        <button class="add-button new-schedule">
            Новый график
        </button>`;

    DOM.btnNewSchedule.addEventListener('click', handleNewScheduleClick)
}

async function setGenerateScheduleButtons() {
    const buttonsContainer = DOM.buttonsContainer;

    try {
        buttonsContainer.innerHTML = `
        <button class="toolbar-button schedules">
            Просмотр графиков
        </button>
        <button class="add-button generate" disabled>
            Начать Генерацию
        </button>`;

        DOM.btnGenerate.addEventListener('click', generateButtonCase);

        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getSchedules}`);

        if (!response.ok) {
            throw new Error(`Не удалось получить графики: ${response.status}`);
        }

        const schedules = await response.json();

        DOM.btnSchedules.disabled = schedules.length === 0;

        DOM.btnSchedules.addEventListener('click', handleToSchedulesClick);
    } catch (error) {
        console.error(error);
        throw error;
    }
}


async function createAndLoadSchedule() {
    const validationErrors = validateGenerationForm();
    if (validationErrors.length > 0) {
        alert(`Заполните обязательные поля:\n\n${validationErrors.join('\n')}`);
        return;
    }

    showLoadingSpinner();

    try {
        const requestBody = buildGenerationRequestBody();
        const scheduleResponse = await generateSchedule(requestBody);
        localStorage.setItem(LAST_SCHEDULE_ID_KEY, scheduleResponse.schedule_id);

        await pollScheduleStatus(scheduleResponse.schedule_id);

        const data = await getTableData(scheduleResponse.schedule_id, 1);

        renderTable(data, MONTHS[0]);
        localStorage.removeItem(LAST_SCHEDULE_ID_KEY);
        clearDraftState(); // график успешно создан — черновик больше не нужен
    } catch (error) {
        console.error(error);
        alert("Не удалось сгенерировать график. Проверьте соединение с сервером.");
    } finally {
        hideLoadingSpinner();
        unblockUI();
        await changeUItoChooseSchedule();
    }
}

async function generateButtonCase() {
    await createAndLoadSchedule();
}

function getMemoHTML() {
    return `
    <section class="memo-container">
        <h3 class="memo-container-title">
            <svg style="color: #1C398E" width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16.75C11.8019 16.7474 11.6126 16.6676 11.4725 16.5275C11.3324 16.3874 11.2526 16.1981 11.25 16V11C11.25 10.8011 11.329 10.6103 11.4697 10.4697C11.6103 10.329 11.8011 10.25 12 10.25C12.1989 10.25 12.3897 10.329 12.5303 10.4697C12.671 10.6103 12.75 10.8011 12.75 11V16C12.7474 16.1981 12.6676 16.3874 12.5275 16.5275C12.3874 16.6676 12.1981 16.7474 12 16.75Z" fill="#1C398E"/>
                <path d="M12 9.25C11.8019 9.24741 11.6126 9.16756 11.4725 9.02747C11.3324 8.88737 11.2526 8.69811 11.25 8.5V8C11.25 7.80109 11.329 7.61032 11.4697 7.46967C11.6103 7.32902 11.8011 7.25 12 7.25C12.1989 7.25 12.3897 7.32902 12.5303 7.46967C12.671 7.61032 12.75 7.80109 12.75 8V8.5C12.7474 8.69811 12.6676 8.88737 12.5275 9.02747C12.3874 9.16756 12.1981 9.24741 12 9.25Z" fill="#1C398E"/>
                <path d="M12 21C10.22 21 8.47991 20.4722 6.99987 19.4832C5.51983 18.4943 4.36628 17.0887 3.68509 15.4442C3.0039 13.7996 2.82567 11.99 3.17294 10.2442C3.5202 8.49836 4.37737 6.89472 5.63604 5.63604C6.89472 4.37737 8.49836 3.5202 10.2442 3.17294C11.99 2.82567 13.7996 3.0039 15.4442 3.68509C17.0887 4.36628 18.4943 5.51983 19.4832 6.99987C20.4722 8.47991 21 10.22 21 12C21 14.387 20.0518 16.6761 18.364 18.364C16.6761 20.0518 14.387 21 12 21ZM12 4.5C10.5166 4.5 9.0666 4.93987 7.83323 5.76398C6.59986 6.58809 5.63856 7.75943 5.07091 9.12988C4.50325 10.5003 4.35473 12.0083 4.64411 13.4632C4.9335 14.918 5.64781 16.2544 6.6967 17.3033C7.7456 18.3522 9.08197 19.0665 10.5368 19.3559C11.9917 19.6453 13.4997 19.4968 14.8701 18.9291C16.2406 18.3614 17.4119 17.4001 18.236 16.1668C19.0601 14.9334 19.5 13.4834 19.5 12C19.5 10.0109 18.7098 8.10323 17.3033 6.6967C15.8968 5.29018 13.9891 4.5 12 4.5Z" fill="#1C398E"/>
            </svg>
            Памятка обозначений
        </h3>
        <div>
            <span class="badge badge-ya">Я</span>
            <span>Дневная смена</span>
        </div>
        <div>
            <span class="badge badge-yav">ЯВ</span>
            <span>Выезд в ночную смену</span>
        </div>
        <div>
            <span class="badge badge-n">Н</span>
            <span>Ночная смена</span>
        </div>
        <div>
            <span class="badge badge-nv">НВ</span>
            <span>Выезд в ночную смену</span>
        </div>
        <div>
            <span class="badge badge-eo">ЕО</span>
            <span>Еженедельный отдых</span>
        </div>
        <div>
            <span class="badge badge-mv">МВ</span>
            <span>Мнимая вахта</span>
        </div>
        <div>
            <span class="badge badge-ot">ОТ</span>
            <span>Отпуск</span>
        </div>
        <div>
            <span class="badge badge-do">ДО</span>
            <span>Отпуск без сохранения з/п</span>
        </div>
        <div>
            <span class="badge badge-yaz">ЯЗ</span>
            <span>Заезд в дневную смену</span>
        </div>
        <div>
            <span class="badge badge-yap">Яп</span>
            <span>Переход ночн/дн</span>
        </div>
        <div>
            <span class="badge badge-nz">НЗ</span>
            <span>Заезд в ночную смену</span>
        </div>
        <div>
            <span class="badge badge-np">Нп</span>
            <span>Переход дн/ночн</span>
        </div>
        <div>
            <span class="badge badge-v">В</span>
            <span>Выходной</span>
        </div>
        <div>
            <span class="badge badge-u">У</span>
            <span>Учебный отпуск</span>
        </div>
        <div>
            <span class="badge badge-d">Д</span>
            <span>Оплачиваемый день в пути</span>
        </div>
        <div>
            <span class="badge badge-k">К</span>
            <span>Командировка</span>
        </div>
    </section>`
}

function getSettingsCard(initialData) {
    const container = document.createElement('div');
    container.classList.add('generation-settings-container');


    const title = document.createElement('h3');
    title.classList.add('generation-settings-title');
    title.textContent = 'Настройки генерации';
    title.insertAdjacentHTML('afterbegin', `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#45556C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M14 17H5"></path>
                    <path d="M19 7h-9"></path>
                    <circle cx="17" cy="17" r="3"></circle>
                    <circle cx="7" cy="7" r="3"></circle>
                </svg>`);

    const contentContainer = document.createElement('div');
    contentContainer.classList.add('generation-settings-container-content');

    const contentContainerTitle = document.createElement('h4');
    contentContainerTitle.classList.add('generation-settings-container-title');
    contentContainerTitle.textContent = 'Даты перевахтовок';


    const inputsContainer = document.createElement('div');
    inputsContainer.classList.add('generation-settings-container-inputs');

    const firstDateInput = document.createElement('input');
    const secondDateInput = document.createElement('input');
    const checkBox = document.createElement('input');
    firstDateInput.classList.add('settings-input');
    firstDateInput.dataset.field = 'shift-change-date-1';
    firstDateInput.placeholder = '1';
    firstDateInput.type = 'number';
    firstDateInput.min = '0';
    firstDateInput.max = '31';
    firstDateInput.oninput = () => {
        let value = firstDateInput.value
        if (+value < 0) firstDateInput.value = '0';
        if (+value > 31) firstDateInput.value = '31';
        if (value.length > 2) firstDateInput.value = firstDateInput.value.slice(0, 2);
    }
    secondDateInput.classList.add('settings-input');
    secondDateInput.dataset.field = 'shift-change-date-2';
    secondDateInput.placeholder = '31';
    secondDateInput.type = 'number';
    secondDateInput.min = '0';
    secondDateInput.max = '31';
    secondDateInput.oninput = () => {
        let value = secondDateInput.value
        if (+value < 0) secondDateInput.value = '0';
        if (+value > 31) secondDateInput.value = '31';
        if (value.length > 2) secondDateInput.value = secondDateInput.value.slice(0, 2);
    }
    checkBox.classList.add('settings-input');
    checkBox.dataset.field = 'auto-replace-boss';
    checkBox.type = 'checkbox';
    inputsContainer.append(firstDateInput, secondDateInput, checkBox, 'Автоматически назначать ИО (Исполняющих обязанности)');

    // Раньше в UI не было полей под schedule_name и apply_senior_rules,
    // хотя бэк их ожидает (см. документацию POST /api/schedules/generate) — добавил.
    const nameContainer = document.createElement('div');
    nameContainer.classList.add('generation-settings-container-inputs');

    const scheduleNameInput = document.createElement('input');
    scheduleNameInput.classList.add('settings-input');
    scheduleNameInput.dataset.field = 'schedule-name';
    scheduleNameInput.type = 'text';
    scheduleNameInput.placeholder = 'Название графика (необязательно)';

    const seniorRulesCheckbox = document.createElement('input');
    seniorRulesCheckbox.classList.add('settings-input');
    seniorRulesCheckbox.dataset.field = 'apply-senior-rules';
    seniorRulesCheckbox.type = 'checkbox';

    nameContainer.append(scheduleNameInput, seniorRulesCheckbox, 'Применять правила старшинства');

    if (initialData) {
        firstDateInput.value = initialData.shiftChangeDate1 ?? '';
        secondDateInput.value = initialData.shiftChangeDate2 ?? '';
        checkBox.checked = initialData.autoReplaceBoss ?? false;
        scheduleNameInput.value = initialData.scheduleName ?? '';
        seniorRulesCheckbox.checked = initialData.applySeniorRules ?? false;
    }

    contentContainer.append(contentContainerTitle, inputsContainer, nameContainer);

    container.append(title, contentContainer);

    return container;
}

function getManagersCard(initialData) {
    const container = document.createElement('div');
    container.classList.add('manager-settings-container');

    const title = document.createElement('h3');
    title.classList.add('manager-settings-title');
    title.textContent = 'РСС (Общие роли по участку)'; // Возможно понадобится изменения текста
    title.insertAdjacentHTML('afterbegin', `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>`);
    container.append(title);

    const roles = Array.isArray(initialData?.roles) && initialData.roles.length > 0
        ? initialData.roles
        : [{role: 'Начальник участка'}];

    const roleCards = roles.map(roleData => getEmployeesCard(roleData));

    container.append(...roleCards, getAddRoleButton('Добавить общую роль'));

    return container;
}

function getGroupCard(initialData) {
    const container = document.createElement('div');
    container.classList.add('group-settings-container');

    const title = document.createElement('div');
    const inputContainer = document.createElement('span');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                       </svg>`;
    const groupName= document.createElement('input');
    const deleteGroupButton = document.createElement('button')

    title.classList.add('group-settings-title-container');

    inputContainer.innerHTML = svg;
    inputContainer.classList.add('group-settings-title');
    inputContainer.append(groupName);

    groupName.classList.add('group-name');
    groupName.dataset.field = 'group-name';
    groupName.placeholder = 'Введите название группы...';
    groupName.value = initialData?.name ?? '';

    deleteGroupButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                       <path d="M10 11v6"></path>
                                       <path d="M14 11v6"></path>
                                       <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                       <path d="M3 6h18"></path>
                                       <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                   </svg>`;
    deleteGroupButton.classList.add('delete-group-button');

    title.append(inputContainer, deleteGroupButton);

    deleteGroupButton.addEventListener('click', () => {
        container.remove();
        cleanupOrphanDropdowns();
    });

    const roles = Array.isArray(initialData?.roles) && initialData.roles.length > 0
        ? initialData.roles
        : [{role: 'Оператор технологических установок'}];

    const roleCards = roles.map(roleData => getEmployeesCard(roleData));

    container.append(title, ...roleCards, getAddRoleButton('Добавить роль/разряд на объект'));

    return container;
}

function getAddRoleButton(text) {
    const svg = `
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#151D30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                 </svg>`
    const button = document.createElement('button');
    const span = document.createElement('span');


    button.classList.add('add-role-button');
    span.classList.add('add-role-button-text');
    span.innerHTML = svg;
    span.append(text);
    button.append(span);

    button.addEventListener('click', () => {
        const parent = button.parentNode;
        const employeesSettingsCard = parent.querySelector('.employees-settings-card');
        if (employeesSettingsCard) {
            employeesSettingsCard.after(getEmployeesCard());
        } else {
            Array.from(parent.children).at(-1).before(getEmployeesCard());
        }
    });

    return button;
}

function getAddGroupButton() {
    const button = document.createElement('button');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin w-5 h-5" aria-hidden="true">
                            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>`;
    button.classList.add('add-group-button');
    button.innerHTML = svg;
    button.append('Добавить новую группу');

    button.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button');

        if (!button) return;

        button.before(getGroupCard());
    });

    return button;
}

function createTitleIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DBEAFE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 17H5"></path>
            <path d="M19 7h-9"></path>
            <circle cx="17" cy="17" r="3"></circle>
            <circle cx="7" cy="7" r="3"></circle>
        </svg>`;
}

function createRoleInput(role) {
    const roleInput = document.createElement('input');
    roleInput.classList.add('employees-settings-card-role-input');
    roleInput.dataset.field = 'role-name';
    roleInput.placeholder = 'Название роли...';
    roleInput.value = role ?? '';
    roleInput.title = role ?? '';
    return roleInput;
}

function createGradeSelector() {
    const select = document.createElement('select');
    select.classList.add('employees-settings-card-selector');
    select.dataset.field = 'role-grade';
    select.add(new Option('Без разряда', ''));
    select.add(new Option('Руководитель', 'manager'));
    for (let i = 1; i <= 8; i++) {
        select.add(new Option(`${i} разряд`, String(i)));
    }
    return select;
}

function createDeleteRoleButton() {
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-role-button');
    deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                   <path d="M10 11v6"></path>
                                   <path d="M14 11v6"></path>
                                   <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                   <path d="M3 6h18"></path>
                                   <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>`;
    return deleteButton;
}

function createDemandInput(labelText, demandType) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('demand-input-container');

    const label = document.createElement('label');
    label.textContent = labelText;

    const input = document.createElement('input');
    input.classList.add('settings-input');
    input.dataset.demand = demandType; // 'day' | 'night'
    input.type = 'number';
    input.min = '0';
    input.value = '0';
    input.oninput = () => {
        let value = input.value;
        if (+value < 0) input.value = '0';
        if (value.length > 2) input.value = input.value.slice(0, 2);
    };

    wrapper.append(label, input);
    return wrapper;
}

function createDemandContainer() {
    const demandContainer = document.createElement('div');
    demandContainer.classList.add('demand-container');

    const label = document.createElement('span');
    label.classList.add('demand-label');
    label.textContent = 'Спрос:';

    const dayWrapper = createDemandInput('Д', 'day');

    const divider = document.createElement('span');
    divider.classList.add('demand-divider');

    const nightWrapper = createDemandInput('Н', 'night');

    demandContainer.append(label, dayWrapper, divider, nightWrapper);
    return demandContainer;
}

function createTitleContainer(role) {
    const titleContainer = document.createElement('div');
    titleContainer.classList.add('employees-settings-card-title');
    titleContainer.insertAdjacentHTML('afterbegin', createTitleIcon());

    const roleInput = createRoleInput(role);
    const select = createGradeSelector();
    const deleteButton = createDeleteRoleButton();
    const demandContainer = createDemandContainer();

    titleContainer.append(roleInput, select, deleteButton, demandContainer);
    return titleContainer;
}

function createTableHead() {
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');

    const headers = ['ФИО Сотрудника', 'Таб. №', 'На вахте с 1 янв.'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headRow.append(th);
    });

    thead.append(headRow);
    return thead;
}

function createTableFoot() {
    const tfoot = document.createElement('tfoot');
    const addEmployeeRow = document.createElement('tr');
    const addEmployeeCell = document.createElement('td');
    addEmployeeCell.colSpan = 3;

    const addEmployee = document.createElement('div');
    addEmployee.classList.add('settings-add-employee');
    addEmployee.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 21a8 8 0 0 1 13.292-6"></path>
            <circle cx="10" cy="8" r="5"></circle>
            <path d="M19 16v6"></path>
            <path d="M22 19h-6"></path>
        </svg>
        <span>Добавить сотрудника</span>
    `;

    addEmployeeCell.append(addEmployee);
    addEmployeeRow.append(addEmployeeCell);
    tfoot.append(addEmployeeRow);
    return tfoot;
}

function createTableContainer() {
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('settings-table-container');

    const table = document.createElement('table');
    table.classList.add('table', 'settings');

    const tbody = document.createElement('tbody');
    table.append(createTableHead(), tbody, createTableFoot());

    tableContainer.append(table);
    return tableContainer;
}

// Реестр активных дропдаунов автокомплита — нужен, чтобы убирать их из
// document.body, когда строку/роль/группу, к которой они относятся, удалили
// (дропдаун вынесен в body отдельным узлом, поэтому tr.remove() его сам не уберёт).
const activeAutocompleteDropdowns = [];

function cleanupOrphanDropdowns() {
    for (let i = activeAutocompleteDropdowns.length - 1; i >= 0; i--) {
        const {tr, dropdown} = activeAutocompleteDropdowns[i];
        if (!tr.isConnected) {
            dropdown.remove();
            activeAutocompleteDropdowns.splice(i, 1);
        }
    }
}

function createEmployeeAutocomplete(inputFullName, tr) {
    const dropdown = document.createElement('div');
    dropdown.classList.add('employee-search-dropdown');
    dropdown.hidden = true;
    // Дропдаун кладём в body, а не рядом с инпутом — .settings-table-container
    // у таблицы стоит overflow: hidden (нужен для скруглённых углов таблицы),
    // и он обрезал бы дропдаун, если оставить его внутри таблицы.
    document.body.append(dropdown);
    activeAutocompleteDropdowns.push({tr, dropdown});

    function positionDropdown() {
        const rect = inputFullName.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.minWidth = `${Math.max(rect.width, 280)}px`;
    }

    function renderResults(employees) {
        dropdown.innerHTML = '';

        if (!employees || employees.length === 0) {
            dropdown.hidden = true;
            return;
        }

        employees.forEach(emp => {
            const item = document.createElement('div');
            item.classList.add('employee-search-item');

            const name = emp.full_name ?? '';
            const tabNumber = emp.tab_number ?? '';

            const info = document.createElement('div');
            info.classList.add('employee-search-info');

            const nameEl = document.createElement('div');
            nameEl.classList.add('employee-search-name');
            nameEl.textContent = name;

            const tabEl = document.createElement('div');
            tabEl.classList.add('employee-search-tab');
            tabEl.textContent = `Таб. № ${tabNumber}`;

            info.append(nameEl, tabEl);
            item.append(info);

            item.addEventListener('click', () => {
                inputFullName.value = name;
                tr.dataset.tabNumber = tabNumber;
                const tabDisplay = tr.querySelector('[data-field="tab-number"]');
                if (tabDisplay) tabDisplay.textContent = tabNumber || '—';
                dropdown.hidden = true;
            });

            dropdown.append(item);
        });

        positionDropdown();
        dropdown.hidden = false;
    }

    const debouncedSearch = debounce(async (query) => {
        cleanupOrphanDropdowns();

        if (!query.trim()) {
            dropdown.hidden = true;
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.searchEmployees(encodeURIComponent(query.trim()))}`);
            if (!response.ok) throw new Error(`Ошибка поиска сотрудников: ${response.status}`);
            const employees = await response.json();
            renderResults(employees);
        } catch (error) {
            console.error(error);
            dropdown.hidden = true;
        }
    }, 500);

    inputFullName.addEventListener('input', () => {
        // как только человек начал печатать заново — старая привязка к таб.номеру не актуальна
        tr.dataset.tabNumber = '';
        const tabDisplay = tr.querySelector('[data-field="tab-number"]');
        if (tabDisplay) tabDisplay.textContent = '—';

        debouncedSearch(inputFullName.value);
    });

    window.addEventListener('scroll', () => {
        if (!dropdown.hidden) positionDropdown();
    }, true);

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== inputFullName) {
            dropdown.hidden = true;
        }
    });

    return dropdown;
}

function addEmployeeCardRow(initialData) {
    const tr = document.createElement('tr');
    const tdFullName = document.createElement('td');
    const tdTabNumber = document.createElement('td');
    const tdCheckBox = document.createElement('td');

    const fullNameWrapper = document.createElement('div');
    fullNameWrapper.classList.add('input-fullname-wrapper');

    const inputFullName = document.createElement('input');
    const spanTabNumber = document.createElement('span');
    const checkBoxWrapper = document.createElement('div');
    const checkBox = document.createElement('input');
    const deleteButton = document.createElement('button');

    inputFullName.classList.add('input-fullname');
    inputFullName.dataset.field = 'fio';
    inputFullName.placeholder = 'Введите ФИО';
    inputFullName.value = initialData?.fio ?? '';

    // Таб.№ не вводится руками — подставляется автокомплитом по ФИО
    // (поиск через GET /api/employees?search=<query> с debounce 500мс).
    // Реальное значение хранится в tr.dataset.tabNumber, span — просто отображение.
    spanTabNumber.dataset.field = 'tab-number';
    spanTabNumber.textContent = initialData?.tabNumber || '—';
    tr.dataset.tabNumber = initialData?.tabNumber ?? '';

    // createEmployeeAutocomplete сам кладёт дропдаун в document.body (портал,
    // см. комментарий внутри) — сюда добавляем только сам инпут.
    createEmployeeAutocomplete(inputFullName, tr);
    fullNameWrapper.append(inputFullName);

    checkBoxWrapper.classList.add('check-box-wrapper')

    checkBox.type = 'checkbox';
    checkBox.classList.add('add-employee-row-checkbox');
    checkBox.dataset.field = 'on-site-at-start';
    checkBox.checked = initialData?.onSiteAtStart ?? false;
    tdCheckBox.classList.add('cell-center');

    deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                   <path d="M10 11v6"></path>
                                   <path d="M14 11v6"></path>
                                   <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                   <path d="M3 6h18"></path>
                                   <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>`;
    deleteButton.classList.add('delete-employee-row-button')

    checkBoxWrapper.append(checkBox, deleteButton);
    tdFullName.append(fullNameWrapper);
    tdTabNumber.append(spanTabNumber);
    tdCheckBox.append(checkBoxWrapper);

    tr.append(tdFullName, tdTabNumber, tdCheckBox);

    return tr;
}

function getEmployeesCard(roleOrData) {
    // Принимаем либо просто строку с именем роли (старое поведение),
    // либо объект { role, grade, demand: {day, night}, employees: [...] }
    // — второй вариант используется при восстановлении черновика.
    const data = typeof roleOrData === 'string' || roleOrData == null
        ? {role: roleOrData}
        : roleOrData;

    const container = document.createElement('div');
    container.classList.add('employees-settings-card');

    const titleContainer = createTitleContainer(data.role);
    const tableContainer = createTableContainer();

    if (data.grade !== undefined) {
        titleContainer.querySelector('[data-field="role-grade"]').value = data.grade ?? '';
    }
    if (data.demand) {
        titleContainer.querySelector('[data-demand="day"]').value = data.demand.day ?? 0;
        titleContainer.querySelector('[data-demand="night"]').value = data.demand.night ?? 0;
    }

    container.append(titleContainer, tableContainer);

    if (Array.isArray(data.employees) && data.employees.length > 0) {
        const tbody = tableContainer.querySelector('tbody');
        data.employees.forEach(employeeData => {
            tbody.append(addEmployeeCardRow(employeeData));
        });
    }

    container.addEventListener('click', (e) => {
        const target = e.target;
        const addEmployeeTrigger = target.closest('.settings-add-employee');

        if (addEmployeeTrigger) {
            const tbody = addEmployeeTrigger.closest('table').querySelector('tbody');
            tbody.append(addEmployeeCardRow());
        }

    });

    container.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button')

        if (!button) return;

        if (button.classList.contains('delete-employee-row-button')) {
            const tr = button.closest('tr');
            tr.remove();
            cleanupOrphanDropdowns();
        }

        if (button.classList.contains('delete-role-button')) {
            const roleCard = target.closest('.employees-settings-card');
            roleCard.remove();
            cleanupOrphanDropdowns();
        }

    });

    return container;
}

// ===================== Сбор данных из DOM ролей/групп =====================

/**
 * Собирает данные одной карточки роли (.employees-settings-card) —
 * название, разряд, спрос день/ночь и список сотрудников.
 */
function collectCardData(cardEl) {
    const roleInput = cardEl.querySelector('[data-field="role-name"]');
    const gradeSelect = cardEl.querySelector('[data-field="role-grade"]');
    const dayDemand = cardEl.querySelector('[data-demand="day"]');
    const nightDemand = cardEl.querySelector('[data-demand="night"]');

    const employeeRows = cardEl.querySelectorAll('tbody tr');

    const employees = Array.from(employeeRows).map(row => ({
        fio: row.querySelector('[data-field="fio"]')?.value ?? '',
        tabNumber: row.dataset.tabNumber ?? '',
        onSiteAtStart: row.querySelector('[data-field="on-site-at-start"]')?.checked ?? false,
    }));

    return {
        role: roleInput?.value ?? '',
        grade: gradeSelect?.value ?? '',
        demand: {
            day: Number(dayDemand?.value ?? 0),
            night: Number(nightDemand?.value ?? 0),
        },
        employees,
    };
}

/** Собирает все карточки ролей внутри произвольного контейнера (группы или карточки РСС). */
function collectRolesFrom(containerEl) {
    const cards = containerEl.querySelectorAll(':scope > .employees-settings-card');
    return Array.from(cards).map(collectCardData);
}

/** Собирает одну группу (локацию) — имя + роли внутри неё. */
function collectGroupData(groupEl) {
    return {
        name: groupEl.querySelector('[data-field="group-name"]')?.value ?? '',
        roles: collectRolesFrom(groupEl),
    };
}

/** Роли РСС ("Общие роли по участку") — не привязаны к конкретной группе/локации. */
function collectGeneralRolesData() {
    const managersCard = document.querySelector('.manager-settings-container');
    if (!managersCard) return [];
    return collectRolesFrom(managersCard);
}

/** Общие настройки генерации (даты перевахтовки, флаги, название). */
function collectGlobalSettings() {
    const settingsCard = document.querySelector('.generation-settings-container');
    if (!settingsCard) {
        return {
            scheduleName: '',
            shiftChangeDate1: '',
            shiftChangeDate2: '',
            autoReplaceBoss: false,
            applySeniorRules: false,
        };
    }

    return {
        scheduleName: settingsCard.querySelector('[data-field="schedule-name"]')?.value ?? '',
        shiftChangeDate1: settingsCard.querySelector('[data-field="shift-change-date-1"]')?.value ?? '',
        shiftChangeDate2: settingsCard.querySelector('[data-field="shift-change-date-2"]')?.value ?? '',
        autoReplaceBoss: settingsCard.querySelector('[data-field="auto-replace-boss"]')?.checked ?? false,
        applySeniorRules: settingsCard.querySelector('[data-field="apply-senior-rules"]')?.checked ?? false,
    };
}

/** Собирает все группы (локации) со страницы. */
function collectAllGroupsData() {
    const groupEls = document.querySelectorAll('.group-settings-container');
    return Array.from(groupEls).map(collectGroupData);
}

/**
 * Собирает ПОЛНОЕ состояние UI генерации в одном объекте — используется
 * и для черновика в localStorage, и как основа для тела запроса.
 */
function collectFullUIState() {
    return {
        settings: collectGlobalSettings(),
        generalRoles: collectGeneralRolesData(),
        groups: collectAllGroupsData(),
    };
}

/**
 * Собирает тело запроса под формат POST /api/schedules/generate.
 *
 * РСС ("Начальник участка" и т.п. — карточка .manager-settings-container)
 * подтверждено с бэкендером: идёт ОДИН РАЗ отдельной группой в массиве
 * groups, а не дублируется в каждую группу-локацию.
 */
const RSS_GROUP_NAME = 'РСС'; // TODO: уточнить у бэкендера точное ожидаемое имя группы

function buildGenerationRequestBody() {
    const settings = collectGlobalSettings();
    const generalRoles = collectGeneralRolesData();
    const groups = collectAllGroupsData();

    const shiftChangeDates = [settings.shiftChangeDate1, settings.shiftChangeDate2]
        .filter(v => v !== '' && v !== null && v !== undefined)
        .map(Number);

    const allGroups = [
        {name: RSS_GROUP_NAME, roles: generalRoles},
        ...groups,
    ];

    return {
        year: new Date().getFullYear(),
        schedule_name: settings.scheduleName || undefined,
        shift_change_dates: shiftChangeDates,
        auto_replace_boss: settings.autoReplaceBoss,
        apply_senior_rules: settings.applySeniorRules,
        groups: allGroups.map(group => ({
            name: group.name,
            roles: group.roles.map(roleToApiFormat),
        })),
    };
}

/** Приводит собранную роль к формату, который ждёт бэк (demand + employees). */
function roleToApiFormat(role) {
    return {
        name: role.role,
        demand: {day: role.demand.day, night: role.demand.night},
        employees: role.employees
            .filter(emp => emp.fio.trim() !== '') // пропускаем пустые незаполненные строки
            .map(emp => ({
                tabNumber: emp.tabNumber,
                name: emp.fio,
                on_site_at_start: emp.onSiteAtStart,
            })),
    };
}

// ===================== Валидация формы генерации =====================

function markInvalid(el, isInvalid, silent) {
    if (!el || silent) return;
    el.classList.toggle('field-invalid', isInvalid);
}

/** Спрос считается заполненным, если хотя бы одно из значений (день/ночь) больше 0. */
function isDemandFilled(demand) {
    return (Number(demand.day) || 0) + (Number(demand.night) || 0) > 0;
}

/** Валидирует одну карточку роли: название, спрос, сотрудников (таб.№/ФИО). */
function validateRoleCard(cardEl, silent) {
    const errors = [];

    const roleInput = cardEl.querySelector('[data-field="role-name"]');
    const dayDemand = cardEl.querySelector('[data-demand="day"]');
    const nightDemand = cardEl.querySelector('[data-demand="night"]');
    const roleName = roleInput?.value.trim() ?? '';
    const roleLabel = roleName || '(без названия)';

    const roleNameFilled = roleName !== '';
    markInvalid(roleInput, !roleNameFilled, silent);
    if (!roleNameFilled) errors.push('Не заполнено название роли');

    const demand = {
        day: Number(dayDemand?.value ?? 0),
        night: Number(nightDemand?.value ?? 0),
    };
    const demandOk = isDemandFilled(demand);
    markInvalid(dayDemand, !demandOk, silent);
    markInvalid(nightDemand, !demandOk, silent);
    if (!demandOk) errors.push(`Роль "${roleLabel}": спрос не заполнен (день и ночь равны 0)`);

    let validEmployeesCount = 0;
    const rows = cardEl.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const fioInput = row.querySelector('[data-field="fio"]');
        const fio = fioInput?.value.trim() ?? '';
        const tabNumber = row.dataset.tabNumber?.trim() ?? '';

        if (fio === '' && tabNumber === '') return; // пустая незаполненная строка — пропускаем

        const rowValid = fio !== '' && tabNumber !== '';
        markInvalid(fioInput, !rowValid, silent);

        if (rowValid) {
            validEmployeesCount++;
        } else {
            errors.push(`Роль "${roleLabel}": сотрудник "${fio || '—'}" не выбран из списка (нет таб. номера)`);
        }
    });

    if (validEmployeesCount === 0) {
        errors.push(`Роль "${roleLabel}": нет ни одного сотрудника`);
    }

    return errors;
}

/**
 * Полная валидация формы генерации графика. По умолчанию помечает
 * невалидные поля классом .field-invalid — передай silent=true, чтобы
 * только проверить валидность без подсветки (например, для живого
 * enable/disable кнопки генерации на каждое изменение формы).
 * Возвращает список текстовых ошибок — пустой массив значит, что
 * форму можно отправлять.
 */
function validateGenerationForm(silent = false) {
    const errors = [];

    const settingsCard = document.querySelector('.generation-settings-container');
    const date1 = settingsCard?.querySelector('[data-field="shift-change-date-1"]');
    const date2 = settingsCard?.querySelector('[data-field="shift-change-date-2"]');
    const date1Filled = (date1?.value.trim() ?? '') !== '';
    const date2Filled = (date2?.value.trim() ?? '') !== '';

    markInvalid(date1, !date1Filled, silent);
    markInvalid(date2, !date2Filled, silent);
    if (!date1Filled || !date2Filled) errors.push('Не заполнены даты перевахтовок');

    const managersCard = document.querySelector('.manager-settings-container');
    if (managersCard) {
        managersCard.querySelectorAll(':scope > .employees-settings-card')
            .forEach(card => errors.push(...validateRoleCard(card, silent)));
    }

    const groupEls = document.querySelectorAll('.group-settings-container');
    if (groupEls.length === 0) {
        errors.push('Нужна хотя бы одна группа');
    }

    groupEls.forEach(groupEl => {
        const nameInput = groupEl.querySelector('[data-field="group-name"]');
        const nameFilled = (nameInput?.value.trim() ?? '') !== '';
        markInvalid(nameInput, !nameFilled, silent);
        if (!nameFilled) errors.push('У группы не заполнено название');

        groupEl.querySelectorAll(':scope > .employees-settings-card')
            .forEach(card => errors.push(...validateRoleCard(card, silent)));
    });

    return errors;
}

// ===================== Черновик состояния UI (localStorage) =====================

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function saveDraftState() {
    try {
        const state = collectFullUIState();
        localStorage.setItem(DRAFT_STATE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Не удалось сохранить черновик:', error);
    }
}

const debouncedSaveDraftState = debounce(saveDraftState, DRAFT_SAVE_DEBOUNCE_MS);

function loadDraftState() {
    try {
        const raw = localStorage.getItem(DRAFT_STATE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('Не удалось прочитать черновик:', error);
        return null;
    }
}

function clearDraftState() {
    localStorage.removeItem(DRAFT_STATE_KEY);
}

/** Вешает один делегированный листенер на весь блок генерации для автосохранения черновика. */
function attachDraftAutoSave(rootEl) {
    rootEl.addEventListener('input', debouncedSaveDraftState);
    rootEl.addEventListener('change', debouncedSaveDraftState);
    // клики, которые добавляют/удаляют роли, группы, сотрудников — тоже меняют состояние
    rootEl.addEventListener('click', debouncedSaveDraftState);
}

/** Живое enable/disable кнопки "Начать Генерацию" — без подсветки полей. */
function updateGenerateButtonState() {
    const btn = DOM.btnGenerate;
    if (!btn) return;
    btn.disabled = validateGenerationForm(true).length > 0;
}

/** Снимает подсветку ошибки с поля сразу, как только пользователь начал его исправлять. */
function attachLiveValidationClear(rootEl) {
    const clear = (e) => e.target.classList?.remove('field-invalid');
    rootEl.addEventListener('input', clear);
    rootEl.addEventListener('change', clear);
    rootEl.addEventListener('input', updateGenerateButtonState);
    rootEl.addEventListener('change', updateGenerateButtonState);
    rootEl.addEventListener('click', updateGenerateButtonState);
}

async function changeUItoChooseSchedule() {
    try {
        DOM.content.innerHTML = ''; // убираем карточки генерации (настройки/РСС/группы), если были

        await setChooseScheduleSelectors();
        setChooseScheduleButtons();

        document.querySelector('.memo-container')?.remove(); // не плодим памятки при повторном входе
        DOM.tableContainer.insertAdjacentHTML('afterend', getMemoHTML());
    } catch (error) {
        console.log(`Не удалось сменить режим: ${error}`);
    }
}

async function changeUItoGenerateSchedule() {
    try {
        DOM.content.innerHTML = ''; // защитно, на случай повторного входа без промежуточного choose-режима
        document.querySelector('.memo-container')?.remove();
        DOM.tableContainer?.remove(); // таблица графика не нужна на экране предгенерации

        await setGenerateScheduleSelectors()
        await setGenerateScheduleButtons()

        const draft = loadDraftState();

        const content = DOM.content;
        content.append(
            getSettingsCard(draft?.settings),
            getManagersCard({roles: draft?.generalRoles}),
            getAddGroupButton()
        );

        // группы (локации) добавляются перед кнопкой "Добавить новую группу"
        const addGroupButton = content.querySelector('.add-group-button');
        if (Array.isArray(draft?.groups)) {
            draft.groups.forEach(groupData => {
                addGroupButton.before(getGroupCard(groupData));
            });
        }

        attachDraftAutoSave(content);
        attachLiveValidationClear(content);
        updateGenerateButtonState();
    } catch (error) {
        console.log(`Не удалось сменить режим: ${error}`);
    }
}

async function handleToSchedulesClick() {
    await changeUItoChooseSchedule();
}

async function handleNewScheduleClick() {
    await changeUItoGenerateSchedule();
}

function updateButtonState() {
    const isValid = DOM.allSelectors[0].checkValidity() && DOM.allSelectors[1].checkValidity();
    DOM.btnGenerate.disabled = !isValid;
}

function attachSelectorListenersToGenerate() {
    DOM.allSelectors.forEach(selector => {
        selector.addEventListener("change", updateButtonState);
    });
    updateButtonState();
}

async function updateTableData() {
    const selectors = DOM.allSelectors;
    if (!selectors[0].checkValidity()) return;

    try {
        const tableData = await getTableData(selectors[0].value, selectors[1].value);
        const month = MONTHS[Number(selectors[1].value) - 1];
        renderTable(tableData, month);
    } catch (error) {
        console.error(error.message);
    }
}

function attachSelectorListenersToRenderTable() {
    DOM.allSelectors.forEach(selector => {
        selector.addEventListener("change", updateTableData);
    });
    return updateTableData();
}

async function pollScheduleStatus(scheduleId) {
    polling: while (true) {
        const rawData = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getScheduleStatus(scheduleId)}`);
        const response = await rawData.json();

        switch (response.status) {
            case ScheduleStatus.ERROR:
                throw new Error(`Ошибка генерации графика: ${response.message}`);
            case ScheduleStatus.OPTIMAL:
                unblockUI();
                break polling;
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

async function checkGenerationStatus() {
    const lastScheduleId = localStorage.getItem(LAST_SCHEDULE_ID_KEY);
    if (!lastScheduleId) return;

    const rawData = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getScheduleStatus(lastScheduleId)}`);
    const response = await rawData.json();

    if (response.status !== ScheduleStatus.PROCESSING) {
        localStorage.removeItem(LAST_SCHEDULE_ID_KEY);
        return;
    }

    blockUI();
    showLoadingSpinner();

    try {
        await pollScheduleStatus(lastScheduleId);
        const data = await getTableData(lastScheduleId, 1);
        renderTable(data, MONTHS[0]);
        localStorage.removeItem(LAST_SCHEDULE_ID_KEY);
    } catch (error) {
        console.error("Ошибка при восстановлении генерации:", error);
    } finally {
        hideLoadingSpinner();
        unblockUI();
        await changeUItoChooseSchedule();
    }
}

async function initScheduleUI() {
    const rawDataSchedules = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getSchedules}`);
    const schedules = await rawDataSchedules.json();

    if (schedules.length === 0) await changeUItoGenerateSchedule();
    else await changeUItoChooseSchedule();
}

export async function init() {
    await initScheduleUI();

    await checkGenerationStatus();
}