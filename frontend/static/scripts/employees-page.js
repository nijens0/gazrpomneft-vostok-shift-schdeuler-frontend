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
    },
    get searchIcon() {
        return document.querySelector('.search-icon')
    },
    get inputSearch() {
        return document.querySelector('.search');
    }
}

const columns = [
    {key: 'full_name', label: 'ФИО', align: 'left', type: 'normal'},
    {key: 'tab_number', label: 'ТАБ. №', align: 'left'},
    {key: 'gender', label: 'ПОЛ', align: 'center'},
    {key: 'role_name', label: 'ДОЛЖНОСТЬ', align: 'left', type: 'wide'},
    {key: 'facility_name', label: 'ПРОМЫСЕЛ', align: 'left', type: 'wide'},
    {key: 'department_name', label: 'УЧАСТОК', align: 'left', type: 'wide'},
    {key: 'work_method', label: 'ВАХТОВЫЙ МЕТОД', align: 'center'},
    {key: 'base_city', label: 'БАЗОВЫЙ ГОРОД', align: 'center'},
    {key: 'gathering_point', label: 'ПУНКТ СБОРА', align: 'left', type: 'normal'},
    {key: 'rank', label: 'РАЗРЯД', align: 'center'},
    {key: 'personnel_subdivision', label: 'ПОДРАЗДЕЛ ПЕРСОНАЛА', align: 'center'},
    {key: 'activity', label: 'КОМПЕТЕНЦИИ', align: 'center'},
    {key: 'can_work_night', label: 'НОЧЬ', align: 'center', attributes: '1'},
    {key: 'senior', label: 'СТ. ОПЕРАТОР', align: 'center', attributes: '1'},
    {key: 'can_replace_boss', label: 'ЗАМ. НАЧАЛЬНИКА СМЕНЫ', align: 'center', attributes: '1'},
    {key: 'can_replace_senior', label: 'ЗАМ. СТ. ОПЕРАТОРА', align: 'center', attributes: '1'},
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

        if (!response.ok) {
            throw new Error(`Ошибка сервера ${response.status}`);
        }

        const employeesJson = await response.json();

        return employeesJson
            .map(employeeData => new Employee(employeeData))
            .sort((a, b) => a.full_name.localeCompare(b.full_name));
    } catch (error) {
        console.log(error);
        throw error;
    }
}

function getTableRow(user) {
    const row = document.createElement('tr');

    columns.forEach((col, index) => {
        const td = document.createElement('td');

        td.dataset.key = col.key;
        td.classList.add('editable');

        if (index === 0) td.classList.add('sticky-col');
        if (col.align) td.classList.add(`cell-${col.align}`);
        if (col.type) td.classList.add(`cell-${col.type}`);
        if (col.attributes) td.dataset.attributes = col.attributes;

        const value = col.attributes ? user.attributes?.[col.key] : user[col.key];
        td.textContent = typeof value === 'boolean' ? (value ? '1' : '0') : (value ?? '');

        row.appendChild(td);
    });

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

async function importEmployeesTable(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${API_BASE_URL}${API_ENDPOINTS.importEmployees}`, {
        method: 'POST',
        body: formData
    }).then(response => {
        if (response.ok) {
            alert('Сотрудники успешно загружены!');
            location.reload();
        }
        else {
            alert('Сотрудники не загружен!!')
        }
    });
}

function importEmployeesTableListener() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xlsm,.xltx,.xltm';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    fileInput.click();
    fileInput.addEventListener('change', importEmployeesTable);
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
    columns.forEach((col) => {
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
            if (employee.full_name.trim() < td.textContent.trim()) {
                tr.before(getTableRow(employee));

                DOM.employeesStats.textContent = `${+DOM.employeesStats.textContent + 1}`;

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

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function findEmployeeRowByTabNumber(tabNumber) {
    const trs = DOM.tbody.querySelectorAll('tr');

    for (const tr of trs) {
        const tabCell = tr.children[1];
        if (tabCell && tabCell.textContent.trim() === String(tabNumber).trim()) {
            return tr;
        }
    }

    return null;
}

function scrollToEmployeeRow(tr) {
    tr.scrollIntoView({behavior: 'smooth', block: 'center'});

    const originalBg = tr.style.backgroundColor;
    tr.style.transition = 'background-color 0.3s ease';
    tr.style.backgroundColor = 'var(--row-highlight, #fff3b0)';

    setTimeout(() => {
        tr.style.backgroundColor = originalBg;
    }, 1200);
}

function createEmployeeSearchDropdown(inputSearch) {
    const dropdown = document.createElement('div');
    dropdown.classList.add('employee-search-dropdown');
    dropdown.hidden = true;
    document.body.append(dropdown);

    function positionDropdown() {
        const rect = inputSearch.getBoundingClientRect();
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
                inputSearch.value = name;
                dropdown.hidden = true;

                const row = findEmployeeRowByTabNumber(tabNumber);
                if (row) {
                    scrollToEmployeeRow(row);
                } else {
                    console.warn(`Строка сотрудника с таб. № ${tabNumber} не найдена в таблице`);
                }
            });

            dropdown.append(item);
        });

        positionDropdown();
        dropdown.hidden = false;
    }

    async function search(query) {
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
    }

    const debouncedSearch = debounce(search, 500);

    inputSearch.addEventListener('input', () => {
        debouncedSearch(inputSearch.value);
    });

    inputSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') search(inputSearch.value);
    });

    DOM.searchIcon.addEventListener('click', () => search(inputSearch.value));

    window.addEventListener('scroll', () => {
        if (!dropdown.hidden) positionDropdown();
    }, true);

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== inputSearch) {
            dropdown.hidden = true;
        }
    });

    return dropdown;
}

let contextMenu = null;
let menuCell = null;   // ячейка, на которой открыли меню
let editState = null;  // { td, oldValue, input, saving }

/* ---------- Контекстное меню ---------- */

function createContextMenu() {
    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.hidden = true;
    menu.innerHTML = `
        <button type="button" class="context-menu-item" data-action="delete">
            <img src="/static/icons/bin.png" alt="">
            <span>Удалить</span>
        </button>
        <button type="button" class="context-menu-item" data-action="edit">
            <img src="/static/icons/pencil.png" alt="">
            <span>Редактировать</span>
        </button>`;
    document.body.appendChild(menu);
    return menu;
}

function showContextMenu(x, y, td) {
    menuCell = td;
    contextMenu.hidden = false;

    // не даём меню вылезти за экран
    const {offsetWidth: w, offsetHeight: h} = contextMenu;
    contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - w - 8))}px`;
    contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - h - 8))}px`;
}

function hideContextMenu() {
    if (!contextMenu) return;
    contextMenu.hidden = true;
    menuCell = null;
}

function initContextMenu() {
    contextMenu = createContextMenu();

    DOM.table.addEventListener('contextmenu', (e) => {
        // внутри редактируемой ячейки оставляем нативное меню (копировать/вставить)
        if (e.target.closest('.cell-edit')) return;

        const td = e.target.closest('tbody td.editable');
        if (!td) {
            hideContextMenu();
            return;
        }

        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, td);
    });

    contextMenu.addEventListener('click', (e) => {
        const item = e.target.closest('[data-action]');
        if (!item || !menuCell) return;

        const td = menuCell;
        hideContextMenu();

        if (item.dataset.action === 'edit') startEdit(td);
        if (item.dataset.action === 'delete') deleteRow(td.closest('tr'));
    });

    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) hideContextMenu();
    });
    document.addEventListener('contextmenu', (e) => {
        if (!DOM.table.contains(e.target)) hideContextMenu();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideContextMenu();
    });
    window.addEventListener('scroll', hideContextMenu, true);
    window.addEventListener('resize', hideContextMenu);
}

/* ---------- Редактирование одной ячейки ---------- */

const ICON_CHECK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>`;
const ICON_CROSS = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

function startEdit(td) {
    // одновременно редактируем только одну ячейку
    if (editState) {
        editState.input.focus();
        return;
    }

    const oldValue = td.textContent.trim();

    const wrapper = document.createElement('div');
    wrapper.classList.add('cell-edit');

    const input = document.createElement('input');
    input.classList.add('table-input');
    input.value = oldValue;

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.title = 'Сохранить';
    saveBtn.classList.add('cell-edit-btn', 'cell-edit-save');
    saveBtn.innerHTML = ICON_CHECK;
    saveBtn.addEventListener('click', saveEdit);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.title = 'Отменить';
    cancelBtn.classList.add('cell-edit-btn', 'cell-edit-cancel');
    cancelBtn.innerHTML = ICON_CROSS;
    cancelBtn.addEventListener('click', cancelEdit);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
    });

    wrapper.append(input, saveBtn, cancelBtn);
    td.textContent = '';
    td.appendChild(wrapper);

    editState = {td, oldValue, input, saving: false};
    input.focus();
    input.select();
}

function cancelEdit() {
    if (!editState || editState.saving) return;

    editState.td.textContent = editState.oldValue;
    editState = null;
}

async function saveEdit() {
    if (!editState || editState.saving) return;

    const {td, oldValue, input} = editState;
    const key = td.dataset.key;
    const isAttribute = Boolean(td.dataset.attributes);
    const value = input.value.trim();

    if (value === oldValue) {
        cancelEdit();
        return;
    }

    if (isAttribute && value !== '0' && value !== '1') {
        alert('В этом столбце допустимы только значения 0 и 1');
        input.focus();
        return;
    }

    // таб. номер берём "старый": по нему сотрудник ищется на сервере
    const tr = td.closest('tr');
    const tabNumber = key === 'tab_number'
        ? oldValue
        : tr.querySelector('[data-key="tab_number"]').textContent.trim();

    // как в старом коде: изменённое поле + все непустые атрибуты строки
    const payload = {};
    tr.querySelectorAll('td.editable').forEach(cell => {
        const cellKey = cell.dataset.key;
        const cellValue = cell === td ? value : cell.textContent.trim();

        if (cell.dataset.attributes) {
            if (cellValue !== '') {
                payload[cellKey] = cellValue === '1' ? true : cellValue === '0' ? false : cellValue;
            }
        } else if (cell === td) {
            payload[cellKey] = cellValue;
        }
    });
    console.log('PATCH', tabNumber, payload);

    editState.saving = true;
    input.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.updateEmployee(tabNumber)}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

        td.textContent = value;
        editState = null;
    } catch (error) {
        // остаёмся в режиме редактирования: можно повторить или отменить
        editState.saving = false;
        input.disabled = false;
        input.focus();
        alert(`Не удалось обновить данные: ${error.message}`);
    }
}

/* ---------- Удаление строки ---------- */

async function deleteRow(tr) {
    if (editState && tr.contains(editState.td)) {
        cancelEdit();
        if (editState) return; // идёт сохранение, подождём
    }

    const tabNumber = tr.querySelector('[data-key="tab_number"]').textContent.trim();
    const name = tr.querySelector('[data-key="full_name"]').textContent.trim();

    if (!confirm(`Удалить сотрудника «${name}» (таб. № ${tabNumber})?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.deleteEmployee(tabNumber)}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

        tr.remove();
        DOM.employeesStats.textContent = `${+DOM.employeesStats.textContent - 1}`;
    } catch (error) {
        alert(`Не удалось удалить сотрудника: ${error.message}`);
    }
}

export function init() {
    initModal();
    renderTableHead();
    initContextMenu();

    DOM.btnImport.addEventListener('click', importEmployeesTableListener);
    DOM.btnExport.addEventListener('click', exportEmployeesTableListener);
    DOM.btnAddEmployee.addEventListener('click', () => {
        DOM.modal.showModal();
    });

    createEmployeeSearchDropdown(DOM.inputSearch);

    getUsers().then(renderTable);
}