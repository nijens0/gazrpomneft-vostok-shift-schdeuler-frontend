import {API_BASE_URL, API_ENDPOINTS} from "./api.js";
/* global XLSX */

const LAST_SCHEDULE_ID_KEY = 'last-schedule-id';

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
    get btnGenerate() {
        return document.querySelector(".add-button");
    },
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
    get btnImport() {
        return document.querySelector('.import');
    },
    get btnExport() {
        return document.querySelector('.export');
    },
    get tableHead() {
        return document.querySelector('.table thead');
    }
};


function buildSelector({ariaLabel, defaultText, items, getLabel, getValue}) {
    const select = document.createElement("select");
    select.classList.add("selector");
    select.required = true;
    select.ariaLabel = ariaLabel;

    const defaultOption = document.createElement("option");
    defaultOption.disabled = true;
    defaultOption.value = "";
    defaultOption.selected = true;
    defaultOption.textContent = defaultText;
    select.appendChild(defaultOption);

    items.forEach(item => {
        select.add(new Option(getLabel(item), getValue(item)));
    });

    return select;
}

function showLoadingSpinner() {
    DOM.btnGenerate.disabled = true;
    DOM.btnGenerate.innerHTML = 'Генерация...';
    DOM.loader.classList.remove('hidden');
}

function hideLoadingSpinner() {
    DOM.btnGenerate.disabled = false;
    DOM.btnGenerate.innerHTML = 'Сформировать график';
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

async function generateSchedule(department_id, year) {
    blockUI();

    const body = {
        department_id: department_id,
        year: year,
        employee_overrides: []
    };

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.generateSchedule}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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

function renderTable(monthlyScheduleInfo, targetTbody = null) {
    const tbody = targetTbody || document.querySelector('.table tbody');
    tbody.innerHTML = '';

    for (const [roleName, employees] of Object.entries(monthlyScheduleInfo.roles)) {
        employees.forEach(employee => {
            const row1 = document.createElement('tr');
            const row2 = document.createElement('tr');
            const row3 = document.createElement('tr');

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

            row1.innerHTML += `
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

            tbody.appendChild(row1);
            tbody.appendChild(row2);
            tbody.appendChild(row3);
        });
    }
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

        const defaultOption = document.createElement('option');
        facilitiesSelector.appendChild(defaultOption);
        defaultOption.value = '';
        defaultOption.text = 'Промысел';
        defaultOption.selected = true;
        defaultOption.disabled = true;

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
        });

        const monthSelector = document.createElement('select');
        monthSelector.classList.add('selector');
        monthSelector.ariaLabel = 'Месяц';
        MONTHS.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = String(index + 1);
            option.text = month.name;
        });

        selectorsContainer.append(schedulesSelector, monthSelector);
    } catch (error) {
        console.error('Не удалось загрузить графики:', error);
    }
}

function renderTableHead(month) {
    const tableHead = DOM.tableHead;
    tableHead.innerHTML = '';
    
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

    tableHead.append(tr1, tr2);
}

async function createAndLoadSchedule(departmentId, facilityId) {
    showLoadingSpinner();

    try {
        const year = new Date().getFullYear();
        const scheduleResponse = await generateSchedule(departmentId, year);
        localStorage.setItem(LAST_SCHEDULE_ID_KEY, scheduleResponse.schedule_id);

        await pollScheduleStatus(scheduleResponse.schedule_id);

        const data = await getTableData(scheduleResponse.schedule_id, 1);

        renderTable(data);
        localStorage.removeItem(LAST_SCHEDULE_ID_KEY);
    } catch (error) {
        console.error(error);
        alert("Не удалось сгенерировать график. Проверьте соединение с сервером.");
    } finally {
        hideLoadingSpinner();
        unblockUI();
        await changeUItoChooseSchedule();
    }
}

async function generateButtonCase(departmentSelector, facilitySelector) {
    await createAndLoadSchedule(departmentSelector.value, facilitySelector.value);
}

async function changeUItoChooseSchedule() {
    try {
        const rawDataSchedules = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getSchedules}`);
        const schedules = await rawDataSchedules.json();

        const scheduleSelector = buildSelector({
            ariaLabel: "Графики",
            defaultText: "Графики",
            items: schedules,
            getLabel: schedule => schedule.name,
            getValue: schedule => schedule.id
        });

        const monthSelector = buildSelector({
            ariaLabel: "Месяц",
            defaultText: "Месяц",
            items: MONTHS.map((month, index) => ({name: month.name, id: index + 1})),
            getLabel: month => month.name,
            getValue: month => month.id
        });
        monthSelector.querySelector('option[value=""]').remove();
        monthSelector.value = "1";

        DOM.allSelectors[0].replaceWith(scheduleSelector);
        DOM.allSelectors[1].replaceWith(monthSelector);

        DOM.btnGenerate.disabled = false;

        attachSelectorListenersToRenderTable();
    } catch (error) {
        console.error(error);
        alert("Не удалось загрузить список графиков. Проверьте соединение с сервером.");
    }
}

async function handleBackClick() {
    const btnImport = DOM.btnImport;
    btnImport.classList.remove('hidden');

    const btnExport = DOM.btnExport;
    btnExport.innerHTML = `
            <img class="toolbar-icon" src="/static/icons/export.svg" alt="Иконка экспорта"/>
            Экспорт в Excel`;
    btnExport.removeEventListener('click', handleBackClick);
    btnExport.addEventListener('click', handleExportClick);

    DOM.btnGenerate.innerHTML = 'Сформировать график';
    await changeUItoChooseSchedule();
}

async function handleExportClick() {
    const scheduleId = DOM.allSelectors[0].value;

    if (!scheduleId) {
        alert("Пожалуйста, выберите график для экспорта.");
        return;
    }

    blockUI();
    const originalBtnText = DOM.btnExport.innerHTML;
    DOM.btnExport.innerHTML = `Сборка Excel...`;

    try {
        const workbook = XLSX.utils.book_new();

        const originalTable = document.querySelector('.table.schedules');
        const theadHTML = originalTable.querySelector('thead').outerHTML;

        for (let month = 1; month <= 12; month++) {
            const monthData = await getTableData(scheduleId, month);

            const tempTable = document.createElement('table');
            tempTable.innerHTML = theadHTML + `<tbody></tbody>`;
            const tempTbody = tempTable.querySelector('tbody');

            renderTable(monthData, tempTbody);

            const worksheet = XLSX.utils.table_to_sheet(tempTable);

            const colWidths = [];
            Object.keys(worksheet).forEach(key => {
                if (key.indexOf('!') === 0) return;

                const cellAddress = XLSX.utils.decode_cell(key);
                const colIdx = cellAddress.c;
                const cellValue = worksheet[key].v ? String(worksheet[key].v) : '';

                if (cellValue.includes("ГРАФИК ВЫХОДНА НА РАБОТУ") || cellValue.includes("ИТОГО ОТРАБОТАНО")) {
                    return;
                }

                const currentWidth = cellValue.length + 2;
                if (!colWidths[colIdx] || currentWidth > colWidths[colIdx]) {
                    colWidths[colIdx] = currentWidth;
                }
            });

            worksheet['!cols'] = colWidths.map((w, colIdx) => {
                if (colIdx >= 5 && colIdx <= 35) {
                    return {wch: 4};
                }
                return {wch: w < 10 ? 10 : w};
            });

            XLSX.utils.book_append_sheet(workbook, worksheet, MONTHS[month - 1]);
        }

        const currentYear = new Date().getFullYear();
        XLSX.writeFile(workbook, `График_работы_${currentYear}.xlsx`);
    } catch (error) {
        console.error("Ошибка при сборке Excel:", error);
        alert("Не удалось экспортировать график. Проверьте соединение с сервером.");
    } finally {
        DOM.btnExport.innerHTML = originalBtnText;
        unblockUI();
    }
}

async function loadFacilities() {
    const rawData = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getFacilities}`);
    const response = await rawData.json();
    console.log(response);

    const facilitySelector = buildSelector({
        ariaLabel: "Промысел",
        defaultText: "Промысел",
        items: response,
        getLabel: facility => facility.facility_name,
        getValue: facility => facility.facility_id
    });

    DOM.allSelectors[1].replaceWith(facilitySelector);
}

async function changeUItoGenerateSchedule() {
    try {
        const departmentSelector = buildSelector({
            ariaLabel: "Участок",
            defaultText: "Участок",
            items: [{id: "1", name: "УППН"}],
            getLabel: item => item.name,
            getValue: item => item.id
        });
        DOM.allSelectors[0].replaceWith(departmentSelector);

        await loadFacilities();

        DOM.btnGenerate.innerHTML = `Начать генерацию`;
        DOM.btnGenerate.disabled = true;

        DOM.btnImport.classList.add('hidden');

        const btnExport = DOM.btnExport;
        btnExport.innerHTML = `Назад`;
        btnExport.removeEventListener('click', handleExportClick);
        btnExport.addEventListener('click', handleBackClick);

        clearTable();
        attachSelectorListenersToGenerate();
    } catch (error) {
        console.error(error);
        alert("Не удалось загрузить список промыслов. Проверьте соединение с сервером.");
    }
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
        renderTable(tableData);
    } catch (error) {
        console.error(error.message);
    }
}

function attachSelectorListenersToRenderTable() {
    DOM.allSelectors.forEach(selector => {
        selector.addEventListener("change", updateTableData);
    });
    updateTableData();
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
        renderTable(data);
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

    DOM.btnExport.addEventListener('click', handleExportClick);

    DOM.btnGenerate.addEventListener("click", async () => {
        if (DOM.btnGenerate.innerHTML.trim() === `Начать генерацию`) {
            await generateButtonCase(DOM.allSelectors[1], DOM.allSelectors[0]);
        } else if (DOM.btnGenerate.innerHTML.trim() === `Сформировать график`) {
            await changeUItoGenerateSchedule();
        }
    });
}