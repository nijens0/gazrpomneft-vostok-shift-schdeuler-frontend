import { Employee } from "./shared.js";
/* global XLSX */

async function getUsers() {
    try {
        const response = await fetch("http://127.0.0.1:5000/api/employees")
        const employeesJson = await response.json();

        if (!response.ok) {
            throw new Error(`Ошибка сервера ${response.status}`);
        }

        const users = employeesJson.map (employeeData => new Employee(employeeData));
        console.log(users);

        return users;
    }
    catch (error) {
        console.log(error);
    }
}

function renderTable(users) {
    const tbody = document.querySelector('.table tbody');
    const amount = document.querySelector('.employees-stats');

    tbody.innerHTML = '';
    amount.innerHTML = `${users.length}`;

    users.forEach(user => {
        const row = document.createElement('tr');

        row.innerHTML = `
        <td class="sticky-col">${user.getFullName()}</td>
        <td>${user.tab_number}</td>
        <td>${user.role_name}</td>
        <td>${user.rank}</td>
        <td>Крапивинское</td>
        <td>${user.department_name}</td>
        <td>${user.activity}</td>
        <td>${user.can_work_night}</td>
        <td>${user.senior}</td>
        <td>${user.can_replace_boss}</td>
        <td>0</td>
        <td>${user.work_method}</td>
        <td>Томск</td>
        <td>Томск</td>
        <td>Томск</td>
        <td>КрапивМесторож</td>
        <td></td>`;

        tbody.appendChild(row);
    })
}

function exportEmployeesTable() {
    const table = document.getElementById('employees-table');

    if (!table) {
        console.error("Таблица не найдена");
        alert("Таблица не найдена!");
        return;
    }

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

        worksheet['!cols'] = colWidths.map(w => ({ wch: w < 10 ? 10 : w }));

        XLSX.utils.book_append_sheet(workbook, worksheet, "Сотрудники");
        XLSX.writeFile(workbook, "employees.xlsx");

        console.log("Таблица успешно экспортирована без столбца Q");
    }
    catch (e) {
        console.error("Ошибка при экспорте:", e);
        alert("Не удалось сгенерировать Excel-файл");
    }
}

function importEmployeesTable(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
                alert("Файл пуст!");
                return;
            }

            const expectedHeaders = [
                "ФИО", "ТАБ. №", "ДОЛЖНОСТЬ", "РАРЗЯРД", "ПРОМЫСЕЛ", "УЧАСТОК",
                "КОМПЕТЕНЦИИ", "НОЧЬ", "СТ. ОПЕРАТОР", "ЗАМ. НАЧАЛЬНИК СМЕНЫ",
                "ЗАМ. СТ. ОПЕРАТОРА", "ВАХТОВЫЙ МЕТОД", "БАЗОВЫЙ ГОРОД",
                "ПУНКТ СБОРА", "МЕСТО ЖИТЕЛЬСТВА", "ПОДРАЗДЕЛ ПЕРСОНАЛА"
            ];

            const fileHeaders = jsonData[0];

            if (!fileHeaders || fileHeaders.length < expectedHeaders.length) {
                alert("Ошибка импорта! Количество колонок в файле не соответствует шаблону.");
                return;
            }

            for (let i = 0; i < expectedHeaders.length; i++) {
                const fileHeaderClean = String(fileHeaders[i] || '').trim().toLowerCase();
                const expectedHeaderClean = expectedHeaders[i].trim().toLowerCase();

                if (fileHeaderClean !== expectedHeaderClean) {
                    alert(`Ошибка формата таблицы!\n\nОжидалась колонка "${expectedHeaders[i]}" на позиции ${i + 1}.\nВместо этого обнаружено: "${fileHeaders[i] || '[Пусто]'}"`);
                    return;
                }
            }

            const importedUsers = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[0]) continue; // Пропускаем пустые строки

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
            console.log("Данные импортированы:", importedUsers);
            alert(`Импорт успешно завершен! Добавлено сотрудников: ${importedUsers.length}`);

        } catch (error) {
            console.error("Ошибка парсинга файла:", error);
            alert("Не удалось распознать Excel-файл. Убедитесь, что файл не поврежден.");
        }
    };

    reader.readAsArrayBuffer(file);

    event.target.value = '';
}

export function init() {
    getUsers().then(users => {
        const buttons = document.querySelectorAll('.toolbar-button');

        const importButton = buttons[0];
        const exportButton = buttons[1];

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx, .xls';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        if (importButton) {
            importButton.addEventListener('click', () => {
                fileInput.click();
            });
        }

        fileInput.addEventListener('change', importEmployeesTable);

        if (exportButton) {
            exportButton.addEventListener('click', exportEmployeesTable);
        }

        renderTable(users);
    });
}