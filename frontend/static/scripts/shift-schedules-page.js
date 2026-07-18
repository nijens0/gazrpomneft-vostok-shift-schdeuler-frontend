class ScheduleInfo {
    constructor(data) {
        this.schedule_id = data.schedule_id;
        this.status = data.status;
        this.message = data.message;
    }
}

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

const generateScheduleButton = document.querySelector(".add-button");
const loader = document.getElementById('loader');
const selectors = document.querySelectorAll('.selector');

function showLoadingSpinner() {
    generateScheduleButton.disabled = true;

    if (loader) {
        loader.classList.remove('hidden');
    } else {
        generateScheduleButton.innerText = 'Генерация...';
    }
}

function hideLoadingSpinner() {
    generateScheduleButton.disabled = false;

    if (loader) {
        loader.classList.add('hidden');
    } else {
        generateScheduleButton.innerText = 'Сформировать график';
    }
}

async function generateSchedule() {
    const body = {
        department_id: 1,
        year: 2026,
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

function renderTable(monthlyScheduleInfo) {
    const tbody = document.querySelector('.table tbody');
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

                symbols += `<td style="background-color: ${bgColor}">${employee.row_1_shift[i]}</td>`
                dayHours += `<td>${employee.row_2_day_hours[i]}</td>`
                nightHours += `<td>${employee.row_3_night_hours[i]}</td>`
            }

            row1.innerHTML += `
                    <td rowspan="3" class="sticky-col">${employee.formatFullName()}</td>
                    <td rowspan="3">${roleName}</td>
                    <td rowspan="3">${employee.rank}</td>
                    <td rowspan="3">${employee.tab_number}</td>
                    <td rowspan="3">${employee.work_method}</td>
                    <td rowspan="3">
                        <select disabled><option>15/15 День</option></select>
                    </td>
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

async function createAndLoadSchedule(scheduleId, month) {
    showLoadingSpinner()

    try {
        // const scheduleInfo = await generateSchedule();

        polling: while (true) {
            const response = await fetch(`http://127.0.0.1:5000/api/schedule/status/${scheduleId}`)
            if (!response.ok) {
                throw new Error(`Ошибка сервера ${response.status}`)
            }
            const data = await response.json()
            console.log(data)
            switch (data.status) {
                case "error":
                    break polling;
                case "optimal":
                    break polling;
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        const data = await getTableData(scheduleId, month);

        renderTable(data);
    } catch (error) {
        console.log(error);
    } finally {
        hideLoadingSpinner()
    }
}

export function init() {
    if (generateScheduleButton) {
        generateScheduleButton.addEventListener("click", async () => {
            const monthSelector = selectors[2]


            await createAndLoadSchedule(4, monthSelector.value);
        });
    } else {
        console.warn("Кнопка генерации не найдена на странице!")
    }
    /* generateScheduleButton.addEventListener('click', async () => {
        getTableData().then(data => {
            renderTable(data.scheduleInfo, data.employees);
        })
    }); */
}