/* global XLSX */

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

    formatFullName() {
        let parts = this.employee_name.split(' ');
        return `${parts[0]} ${parts[1].slice(0, 1)}.${parts[2].slice(0, 1)}.`;
    }

}

const LAST_SCHEDULE_ID_KEY = 'last-schedule-id';

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
    get selectors() {
        return document.querySelectorAll('.selector');
    },
    get btnImport() {
        return document.querySelector('.import');
    },
    get btnExport() {
        return document.querySelector('.export');
    }
};

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

async function generateSchedule(department_id, year) {
    blockUI()

    const body = {
        department_id: department_id,
        year: year,
        employee_overrides: []
    };

    const response = await fetch("http://127.0.0.1:5000/api/schedule/generate", {
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
        const response = await fetch(`http://127.0.0.1:5000/api/schedule/${scheduleId}?month=${month}`)

        if (!response.ok) {
            throw new Error(`Ошибка сервера ${response.status}`);
        }

        const rawData = await response.json();

        return new MonthlyScheduleInfo(rawData);
    } catch (Error) {
        console.error(Error);
        throw Error;
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

            const shiftColors = {
                // --day-shift
                'Я': '#CBF6CB', 'Яз': '#CBF6CB', 'Яп': '#CBF6CB', 'Яв': '#CBF6CB',
                // --night-shift
                'Н': '#D1EAF1', 'Нз': '#D1EAF1', 'Нп': '#D1EAF1', 'Нв': '#D1EAF1',
                // --rest-and-trips
                'В': '#E8ECEF', 'ЕО': '#E8ECEF',
                // --on-the-road-or-trips
                'Д': '#FCEAB0',
                // --vacations
                'От': '#FBD2B3', 'До': '#FBD2B3',
                // --special
                'У': '#E2D9F5', 'К': '#E2D9F5', 'МВ': '#E2D9F5'
            };

            for (let i = 0; i <= 30; i++) {
                const shiftVal = employee.row_1_shift[i] || '';
                const bgColor = shiftColors[shiftVal] || 'transparent';

                symbols += `<td style="background-color: ${bgColor}">${employee.row_1_shift[i] ?? ""}</td>`
                dayHours += `<td>${employee.row_2_day_hours[i] ?? ""}</td>`
                nightHours += `<td>${employee.row_3_night_hours[i] ?? ""}</td>`
            }

            row1.innerHTML += `
                    <td rowspan="3" class="sticky-col">${employee.formatFullName()}</td>
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
                `
            row2.innerHTML = dayHours;
            row3.innerHTML = nightHours;

            tbody.appendChild(row1);
            tbody.appendChild(row2);
            tbody.appendChild(row3);
        })
    }
}

function clearTable() {
    const tbody = document.querySelector('.table tbody');
    if (tbody) tbody.innerHTML = '';
}

async function createAndLoadSchedule(departmentId, facilityId) {
    showLoadingSpinner()

    try {
        const year = new Date().getFullYear()
        const scheduleResponse = await generateSchedule(departmentId, year);
        localStorage.setItem(LAST_SCHEDULE_ID_KEY, scheduleResponse.schedule_id);

        await pollScheduleStatus(scheduleResponse.schedule_id);

        const data = await getTableData(scheduleResponse.schedule_id, 1);

        renderTable(data);
    } catch (error) {
        console.log(error);
    } finally {
        hideLoadingSpinner()
        unblockUI()
        await changeUItoChooseSchedule()
    }
}

async function generateButtonCase(departmentSelector, facilitySelector) {
    await createAndLoadSchedule(departmentSelector.value, facilitySelector.value);
}

async function changeUItoChooseSchedule() {
    const rawDataSchedules = await fetch("http://127.0.0.1:5000/api/schedules");
    const schedules = await rawDataSchedules.json()


    const scheduleSelector = document.createElement("select");
    scheduleSelector.classList.add("selector");
    scheduleSelector.required = true;
    scheduleSelector.ariaLabel = `Графики`

    const defaultOption = document.createElement("option");
    defaultOption.disabled = true;
    defaultOption.value = "";
    defaultOption.selected = true;
    defaultOption.textContent = "Графики"
    scheduleSelector.appendChild(defaultOption);

    schedules.forEach((schedule) => {
        scheduleSelector.add(new Option(`${schedule.name}`, `${schedule.id}`));
    })

    DOM.selectors[0].replaceWith(scheduleSelector);

    DOM.selectors[1].outerHTML = `
                <select class="selector" aria-label="Месяц" required>
                    <option value="1" selected>Январь</option>
                    <option value="2">Февраль</option>
                    <option value="3">Март</option>
                    <option value="4">Апрель</option>
                    <option value="5">Май</option>
                    <option value="6">Июнь</option>
                    <option value="7">Июль</option>
                    <option value="8">Август</option>
                    <option value="9">Сентябрь</option>
                    <option value="10">Октябрь</option>
                    <option value="11">Ноябрь</option>
                    <option value="12">Декабрь</option>
                </select>`

    DOM.btnGenerate.disabled = false;

    attachSelectorListenersToRenderTable();
}

async function handleBackClick() {
    const btnImport = DOM.btnImport;
    btnImport.classList.remove('hidden');

    const btnExport = DOM.btnExport;
    btnExport.innerHTML = `
            <img class="toolbar-icon" src="/static/icons/export.svg" alt="Иконка экспорта"/>
            Экспорт в Excel`
    btnExport.removeEventListener('click', handleBackClick);
    btnExport.addEventListener('click', handleExportClick);

    DOM.btnGenerate.innerHTML = 'Сформировать график'
    await changeUItoChooseSchedule()
}

async function handleExportClick() {
    const scheduleId = DOM.selectors[0].value;

    if (!scheduleId) {
        alert("Пожалуйста, выберите график для экспорта.");
        return;
    }

    blockUI();
    const originalBtnText = DOM.btnExport.innerHTML;
    DOM.btnExport.innerHTML = `Сборка Excel...`;

    try {
        const workbook = XLSX.utils.book_new();
        const monthNames = [
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
        ];

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
                    return { wch: 4 };
                }

                return { wch: w < 10 ? 10 : w };
            });

            XLSX.utils.book_append_sheet(workbook, worksheet, monthNames[month - 1]);
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

async function changeUItoGenerateSchedule() {
    DOM.selectors[0].outerHTML = `
                <select class="selector" aria-label="Участок" required>
                    <option disabled value="" selected>Промысел</option>
                    <option value="1">УППН</option>
                </select>`;

    await loadFacilities()

    DOM.btnGenerate.innerHTML = `Начать генерацию`
    DOM.btnGenerate.disabled = true;

    DOM.btnImport.classList.add('hidden');

    const btnExport = DOM.btnExport;
    btnExport.innerHTML = `Назад`;
    btnExport.removeEventListener('click', handleExportClick);
    btnExport.addEventListener('click', handleBackClick);



    clearTable()
    attachSelectorListenersToGenerate();
}

function updateButtonState() {
    const isValid = DOM.selectors[0].checkValidity() && DOM.selectors[1].checkValidity();
    DOM.btnGenerate.disabled = !isValid;
}

function attachSelectorListenersToGenerate() {
    DOM.selectors.forEach(selector => {
        selector.addEventListener("change", updateButtonState);
    });
    updateButtonState();
}

async function updateTableData() {
    const selectors = DOM.selectors;
    if (!DOM.selectors[0].checkValidity()) return;


    try {
        const tableData = await getTableData(selectors[0].value, selectors[1].value);
        renderTable(tableData);
    } catch (error) {
        console.log(error.message);
    }
}

function attachSelectorListenersToRenderTable() {
    DOM.selectors.forEach(selector => {
        selector.addEventListener("change", updateTableData);
    })
    updateTableData();
}

function blockUI() {
    DOM.overlay.classList.remove('hidden');
}

function unblockUI() {
    DOM.overlay.classList.add('hidden');
}

async function pollScheduleStatus(scheduleId) {
    polling: while (true) {
        const rawData = await fetch(`http://127.0.0.1:5000/api/schedule/status/${scheduleId}`);
        const response = await rawData.json()
        console.log(response)

        switch (response.status) {
            case "error":
                throw new Error(`Ошибка генерации графика: ${response.message}`);
            case "optimal":
                unblockUI();
                break polling;
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

async function checkGenerationStatus() {
    const lastScheduleId = localStorage.getItem(LAST_SCHEDULE_ID_KEY);
    if (lastScheduleId) {
        const rawData = await fetch(`http://127.0.0.1:5000/api/schedule/status/${lastScheduleId}`);
        const response = await rawData.json();
        if (response.status === "processing") {
            blockUI()
            showLoadingSpinner()

            try {
                await pollScheduleStatus(lastScheduleId);
                const data = await getTableData(lastScheduleId, 1);
                renderTable(data);
            } catch (error) {
                console.error("Ошибка при восстановлении генерации:", error);
            } finally {
                hideLoadingSpinner();
                unblockUI();
                await changeUItoChooseSchedule();
            }
        }
    }
}

async function initScheduleUI() {
    const rawDataSchedules = await fetch("http://127.0.0.1:5000/api/schedules");
    const schedules = await rawDataSchedules.json()

    if (schedules.length === 0) await changeUItoGenerateSchedule()
    else await changeUItoChooseSchedule();
}

async function loadFacilities() {
    const rawData = await fetch("http://127.0.0.1:5000/api/facilities");
    const response = await rawData.json();

    const facilitySelector = DOM.selectors[1];
    facilitySelector.innerHTML = `<option disabled value="" selected>Участок</option>`
    response.forEach(facility => {
        facilitySelector.add(new Option(facility.facility_name, facility.facility_id));
    });
}

export async function init() {

    await initScheduleUI();

    checkGenerationStatus();

    DOM.btnExport.addEventListener('click', handleExportClick);

    DOM.btnGenerate.addEventListener("click", async () => {
        if (DOM.btnGenerate.innerHTML.trim() === `Начать генерацию`) {
            await generateButtonCase(DOM.selectors[1], DOM.selectors[0]);
        } else if (DOM.btnGenerate.innerHTML.trim() === `Сформировать график`) {
            await changeUItoGenerateSchedule()
        }
    });
}