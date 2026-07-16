class ScheduleInfo {
    constructor(data) {
        this.schedule_id = data.schedule_id;
        this.status = data.status;
        this.message = data.message;
    }
}

class Schedule {
    constructor(data) {
        this.scheduleId = data.schedule_id;
        this.facility = data.facility;
        this.department = data.department;
        this.year = data.year;
        this.month = data.month;
        this.daysInMonth = data.days_in_month;
        this.shiftTypes = ""
    }
}

class Employee {
    constructor(data) {
        this.id = data.employee_id;
        this.name = data.name;
        this.position = data.position;
        this.schedule = data.schedule;
        this.totals = {
            totalHours: data.totals.total_hours,
            dayHours: data.totals.day_hours,
            nightHours: data.totals.night_hours
        }
    }

    formatName() {
        let fullName = this.name.split(' ');

        return `${fullName[0]} ${fullName[1].slice(0,1)}. ${fullName[2].slice(0,1)}.`;
    }
}

let monthsMap = new Map([
    [1, "январь"],
    [2, "февраль"],
    [3, "март"],
    [4, "апрель"],
    [5, "май"],
    [6, "июнь"],
    [7, "июль"],
    [8, "август"],
    [9, "сентябрь"],
    [10, "октябрь"],
    [11, "ноябрь"],
    [12, "декабрь"]
]);

const generateScheduleButton = document.querySelector(".add-button");
const loader = document.getElementById('loader');

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

async function getTableData() {
    try {
        const response = await fetch("http://localhost:8000/api/v1/schedules/?facility_id=3&department_id=5&year=2026&month=5")
        const rawArray = await response.json();

        if (!response.ok) {
            throw new Error(`Ошибка сервера ${response.status}`);
        }
        const tableDataJson = rawArray[0];

        const scheduleInfo = new Schedule(tableDataJson)
        const employees = tableDataJson.employees.map(data => new Employee(data))

        console.log(scheduleInfo)
        console.log(employees);

        return {
            scheduleInfo: scheduleInfo,
            employees: employees
        }
    } catch (error) {
        console.log(error);
    }
}

function renderTable(scheduleInfo, employees) {
    const tbody = document.querySelector('.table tbody');
    tbody.innerHTML = '';

    employees.forEach(employee => {
        const row1 = document.createElement('tr');
        const row2 = document.createElement('tr');
        const row3 = document.createElement('tr');

        let symbols = ''
        let dayHours = ''
        let nightHours = ''
        for (let i = 1; i <= scheduleInfo.daysInMonth; i++) {
            symbols += `<td>${employee.schedule[i]}</td>`
            dayHours += `<td>5</td>`
            nightHours += `<td>5</td>`
        }

        row1.innerHTML = `
            <td rowspan="3" class="sticky-col">${employee.formatName()}</td>
            <td rowspan="3">${employee.position}</td>
            <td rowspan="3">Разряд</td>
            <td rowspan="3">${employee.id}</td>
            <td rowspan="3">ВР</td>
            <td rowspan="3">Шаблон</td>
            ${symbols}
            <td rowspan="3">${employee.totals.totalHours}</td>
            <td rowspan="3">${employee.totals.dayHours}</td>
            <td rowspan="3">${employee.totals.nightHours}</td>
            <td rowspan="3">-</td>
            <td rowspan="3">-</td>
        `
        row2.innerHTML = dayHours
        row3.innerHTML = nightHours

        tbody.appendChild(row1)
        tbody.appendChild(row2)
        tbody.appendChild(row3)
    })
}

async function createAndLoadSchedule() {
    showLoadingSpinner()

    try {
        console.log("Loading Schedule...");
        const scheduleInfo = await generateSchedule();
        console.log(scheduleInfo);

        chlen: while (true) {
            const response = await fetch(`http://127.0.0.1:5000/api/schedule/status/${scheduleInfo.schedule_id}`)
            const data = await response.json()
            console.log(data)
            switch (data.status) {
                case "error":
                    console.log(data.message);
                    break chlen;
                case "success":
                    console.log(data.message);
                    break chlen;
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        const data = await getTableData();

        renderTable(data.scheduleInfo, data.employees);
    } catch (error) {
        console.log(error);
    } finally {
        hideLoadingSpinner()
    }
}

export function init() {
    if (generateScheduleButton) {
        generateScheduleButton.addEventListener("click", async() => {
            await createAndLoadSchedule();
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