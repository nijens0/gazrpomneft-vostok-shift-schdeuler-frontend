import {Employee} from "./shared.js";
import {API_BASE_URL, API_ENDPOINTS} from "./api.js";
/* global XLSX */

const DOM = {
    get btnImport() {
        return document.querySelector('.import')
    },
    get btnExport() {
        return document.querySelector('.export')
    },
    get btnAddEmployee() {
        return document.querySelector('.add-button')
    },
    get table() {
        return document.querySelector(".table")
    },
    get tbody() {
        return document.querySelector('tbody');
    },
    get employeesAmount() {
        return document.querySelector('.employees-stats');
    },
    get modal() {
        return document.querySelector('dialog')
    },
    get dialog() {
        return document.querySelector('.dialog');
    },
    get tableHead() {
        return document.getElementById('employee-table-head')
    },
    get employeesStats() {
        return document.querySelector('.employees-stats')
    }
}

const columns = [
    {key: 'full_name', label: 'ФИО'},
    {key: 'tab_number', label: 'ТАБ. №'},
    {key: 'sex', label: 'ПОЛ'},
    {key: 'role_name', label: 'ДОЛЖНОСТЬ'},
    {key: 'rank', label: 'РАЗРЯД'},
    {key: 'facility_name', label: 'ПРОМЫСЕЛ'},
    {key: 'department_name', label: 'УЧАСТОК'},
    {key: 'activity', label: 'КОМПЕТЕНЦИИ'},
    {key: 'can_work_night', label: 'НОЧЬ'},
    {key: 'senior', label: 'СТ. ОПЕРАТОР'},
    {key: 'can_replace_boss', label: 'ЗАМ. НАЧАЛЬНИКА СМЕНЫ'},
    {key: 'can_replace_senior', label: 'ЗАМ. СТ. ОПЕРАТОРА'},
    {key: 'work_method', label: 'ВАХТОВЫЙ МЕТОД'},
    {key: 'base_city', label: 'БАЗОВЫЙ ГОРОД'},
    {key: 'collection_point', label: 'ПУНКТ СБОРА'},
    {key: 'residence', label: 'МЕСТО ЖИТЕЛЬСТВА'},
    {key: 'personnel_subsection', label: 'ПОДРАЗДЕЛ ПЕРСОНАЛА'},
    {key: 'actions_with_employee', label: 'ДЕЙСТВИЯ С СОТРУДНИКОМ'}
];

function renderTableHead() {
    const tableHead = DOM.tableHead;
    columns.forEach((column, index) => {
        const cell = document.createElement('th')
        if (index === 0) cell.classList.add('sticky-col')
        cell.textContent = column.label;
        tableHead.appendChild(cell)
    })
}

async function getUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getEmployees}`)
        const employeesJson = await response.json();

        if (!response.ok) {
            throw new Error(`Ошибка сервера ${response.status}`);
        }

        return employeesJson.map(employeeData => new Employee(employeeData)).sort((a, b) => a.full_name.localeCompare(b.full_name));
    } catch (error) {
        console.log(error);
    }
}

function getTableRow(user) {
    const row = document.createElement('tr');

    for (let i = 0; i < columns.length - 1; i++) {
        const td = document.createElement('td');
        const key = columns[i].key;

        td.dataset.key = key;
        td.classList.add('editable');
        if (i === 0) td.classList.add('sticky-col');

        td.textContent = i === 0 ? user.formatFullName() : user[key];

        row.appendChild(td);
    }


    const td = document.createElement('td');
    const editContainer = document.createElement('div');
    editContainer.classList.add('edit-container');
    resetEditContainer(editContainer);
    td.appendChild(editContainer);
    row.appendChild(td);
    
    return row;
}

function renderTable(users) {
    const tbody = DOM.tbody
    const amount = DOM.employeesAmount

    tbody.innerHTML = '';
    amount.innerHTML = `${users.length}`;

    users.forEach(user => {
        const row = getTableRow(user);
        tbody.appendChild(row);
    })
}

function exportEmployeesTableListener() {
    const table = DOM.table

    try {
        const worksheet = XLSX.utils.table_to_sheet(table);

        Object.keys(worksheet).forEach(key => {
            if (key.startsWith('Q')) {
                delete worksheet[key];
            }
        });

        if (worksheet['!ref']) {
            worksheet['!ref'] = worksheet['!ref'].replace(/:Q/, ':P');
        }

        const workbook = XLSX.utils.book_new();

        const objectKeys = Object.keys(worksheet);
        const colWidths = [];

        objectKeys.forEach(key => {
            if (key.indexOf('!') === 0) return;

            const colIdx = key.replace(/[0-9]/g, '').charCodeAt(0) - 65;

            const cellValue = worksheet[key].v ? String(worksheet[key].v) : '';
            const currentWidth = cellValue.length + 3;

            if (!colWidths[colIdx] || currentWidth > colWidths[colIdx]) {
                colWidths[colIdx] = currentWidth;
            }
        });

        worksheet['!cols'] = colWidths.map(w => ({wch: w < 10 ? 10 : w}));

        XLSX.utils.book_append_sheet(workbook, worksheet, "Сотрудники");
        XLSX.writeFile(workbook, "employees.xlsx");

    } catch (e) {
        alert("Не удалось сгенерировать Excel-файл");
    }
}

function importEmployeesTable(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

            if (jsonData.length === 0) {
                alert("Файл пуст!");
                return;
            }

            const fileHeaders = jsonData[0];
            if (!fileHeaders || fileHeaders.length < columns.length) {
                alert("Ошибка импорта! Количество колонок в файле не соответствует шаблону.");
                return;
            }

            for (let i = 0; i < columns.length; i++) {
                const fileHeaderClean = String(fileHeaders[i] || '').trim().toLowerCase();
                const expectedHeaderClean = columns[i].label.trim().toLowerCase();

                if (fileHeaderClean !== expectedHeaderClean) {
                    alert(`Ошибка формата таблицы!\n\nОжидалась колонка "${columns[i].label}" на позиции ${i + 1}.\nВместо этого обнаружено: "${fileHeaders[i] || '[Пусто]'}"`);
                    return;
                }
            }

            const importedUsers = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[0]) continue;

                const fullName = String(row[0]).trim();
                const nameParts = fullName.split(/\s+/);

                const employeeData = {
                    id: row[1] ? String(row[1]).trim() : "",
                    roleId: row[2] ? String(row[2]).trim() : "",
                    role_id: row[2] ? String(row[2]).trim() : "",
                    departmentId: row[4] ? String(row[4]).trim() : "",
                    department_id: row[4] ? String(row[4]).trim() : "",
                    workMethod: row[11] ? String(row[11]).trim() : "",
                    work_method: row[11] ? String(row[11]).trim() : "",

                    lastName: nameParts[0] || "",
                    firstName: nameParts[1] || "",
                    middleName: nameParts[2] || "",
                    last_name: nameParts[0] || "",
                    first_name: nameParts[1] || "",
                    middle_name: nameParts[2] || ""
                };

                importedUsers.push(new Employee(employeeData));
            }

            renderTable(importedUsers);
            alert(`Импорт успешно завершен! Добавлено сотрудников: ${importedUsers.length}`);

        } catch (error) {
            alert("Не удалось распознать Excel-файл. Убедитесь, что файл не поврежден.");
        }
    };

    reader.readAsArrayBuffer(file);

    event.target.value = '';
}

function importEmployeesTableListener() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx, .xls';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.click();
    fileInput.addEventListener('change', importEmployeesTable);
}

function editTableListeners(e, backup) {
    const target = e.target;

    if (target.classList.contains("edit-button")) {
        if (DOM.table.classList.contains("edits")) return;
        backup.length = 0
        DOM.table.classList.add('edits')

        const tr = target.closest('tr');
        const cells = tr.querySelectorAll('.editable');

        cells.forEach(td => {
            let cell = td.innerHTML.trim();
            backup.push(cell)
            td.innerHTML = `<input class="table-input" placeholder="${backup.at(-1)}" value="${backup.at(-1)}">`
        })

        const editContainer = target.closest('.edit-container')
        editContainer.innerHTML =
            `<svg class="apply-button" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50" fill="#64748B" stroke="#64748B" stroke-width="1.5" stroke-linejoin="round">
                        <path d="M 41.9375 8.625 C 41.273438 8.648438 40.664063 9 40.3125 9.5625 L 21.5 38.34375 L 9.3125 27.8125 C 8.789063 27.269531 8.003906 27.066406 7.28125 27.292969 C 6.5625 27.515625 6.027344 28.125 5.902344 28.867188 C 5.777344 29.613281 6.078125 30.363281 6.6875 30.8125 L 20.625 42.875 C 21.0625 43.246094 21.640625 43.410156 22.207031 43.328125 C 22.777344 43.242188 23.28125 42.917969 23.59375 42.4375 L 43.6875 11.75 C 44.117188 11.121094 44.152344 10.308594 43.78125 9.644531 C 43.410156 8.984375 42.695313 8.589844 41.9375 8.625 Z"/>
                     </svg>
                     <svg class="cancel-button" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50" fill="#64748B" stroke="#64748B" stroke-width="1.5" stroke-linejoin="round">
                        <path d="M 9.15625 6.3125 L 6.3125 9.15625 L 22.15625 25 L 6.21875 40.96875 L 9.03125 43.78125 L 25 27.84375 L 40.9375 43.78125 L 43.78125 40.9375 L 27.84375 25 L 43.6875 9.15625 L 40.84375 6.3125 L 25 22.15625 Z"/>
                     </svg>
                    `
    } else if (target.classList.contains("apply-button")) {
        backup.length = 0

        const tr = target.closest('tr');
        const cells = tr.querySelectorAll('.editable');

        cells.forEach(td => {
            const input = td.querySelector('input');

            td.textContent = input.value.trim();
        })

        const editContainer = target.closest('.edit-container')
        resetEditContainer(editContainer);

        DOM.table.classList.remove('edits')
    } else if (target.classList.contains("cancel-button")) {

        const tr = target.closest('tr');
        const cells = tr.querySelectorAll('.editable');

        cells.forEach((td, index) => {
            td.textContent = backup[index]
        });

        const editContainer = target.closest('.edit-container');
        resetEditContainer(editContainer)

        DOM.table.classList.remove('edits')
    } else if (target.classList.contains("delete-button")) {
        const tr = target.closest('tr');
        tr.remove();

        const employeesStats = DOM.employeesStats;
        const stats = employeesStats.textContent;
        employeesStats.textContent = `${+stats - 1}`
    }


}

function resetEditContainer(editContainer) {
    editContainer.innerHTML =
        `<img class="edit-button" src="/static/icons/pencil.png" alt="Редактирование">
         <img class="delete-button" src="/static/icons/bin.png" alt="Удалить">
        `
}

function initModal() {
    const modal = DOM.modal;
    const dialog = DOM.dialog;

    const title = document.createElement('h1');
    title.textContent = 'Добавить сотрудника';
    title.classList.add('dialog-title');
    dialog.appendChild(title);

    const employeeData = document.createElement('div');
    employeeData.classList.add('dialog-employee-data')
    dialog.appendChild(employeeData);
    columns.forEach((col, index) => {
        if (index === columns.length - 1) return;
        const input = document.createElement('input');
        input.classList.add('table-input');
        input.dataset.key = col.key;
        input.placeholder = col.label;
        employeeData.appendChild(input);
    });

    const toolBar = document.createElement('div');
    toolBar.classList.add('toolbar');

    const applyButton = document.createElement('button');
    applyButton.classList.add('toolbar-button');
    applyButton.textContent = 'Добавить';
    applyButton.addEventListener('click', () => {
        const inputs = dialog.querySelectorAll('input');
        const data = {};

        inputs.forEach(input => {
            data[input.dataset.key] = input.value;
            input.value = '';
        });

        const employee = new Employee(data);

        const rows = DOM.table.querySelectorAll('tbody tr');
        for (const tr of rows) {
            const td = tr.firstElementChild;
            if (employee.formatFullName().trim() < td.textContent.trim()) {
                tr.before(getTableRow(employee));

                const employeesStats = DOM.employeesStats;
                const stats = employeesStats.textContent;
                employeesStats.textContent = `${+stats + 1}`;

                modal.close();

                setTimeout(() => {
                    alert('Сотрудник успешно добавлен!');
                }, 50);

                return;
            }
        }
    });


    const cancelButton = document.createElement('button');
    cancelButton.classList.add('toolbar-button');
    cancelButton.textContent = 'Отменить';
    cancelButton.addEventListener('click', () => {
        const inputs = dialog.querySelectorAll('input');

        inputs.forEach(input => input.value = '');

        modal.close();
    });

    const div = document.createElement('div');
    div.classList.add('toolbar');
    div.appendChild(applyButton);
    div.appendChild(cancelButton);

    dialog.appendChild(div);
}

export function init() {
    initModal();
    renderTableHead();

    DOM.btnImport.addEventListener('click', importEmployeesTableListener);
    DOM.btnExport.addEventListener('click', exportEmployeesTableListener);
    DOM.btnAddEmployee.addEventListener('click', () => {
        DOM.modal.showModal();
    });

    getUsers().then(users => {
        renderTable(users);

        let backup = []
        DOM.table.addEventListener("click", (e) => {
            editTableListeners(e, backup)
        });
    });
}