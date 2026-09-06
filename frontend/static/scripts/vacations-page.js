import {API_BASE_URL, API_ENDPOINTS} from "./api.js";

class VacationData {
    constructor(data) {
        this.tab_number = data.tab_number;
        this.facility_name = data.facility_name;
        this.facility_short_name = data.facility_short_name;
        this.department_name = data.department_name;
        this.department_short_name = data.department_short_name;
        this.role_name = data.role_name;
        this.full_name = data.full_name;
        this.vacation_limits = new VacationLimits(data.vacation_limits);
        this.vacations = data.vacations;
    }
}

class VacationLimits {
    constructor(data) {
        this.tab_number = data.tab_number;
        this.norm_days = data.norm_days;
        this.extra_days = data.extra_days;
        this.unused_days = data.unused_days;
        this.total_days = data.total_days;
    }
}

const DOM = {
    getPage() {
        return document.querySelector('.page');
    }
}

const PERIODS = 4;

const EMPLOYEES_COLUMNS = [
    {key: 'tab_number', label: 'ТАБ.№', rowspan: '2', colspan: '1'},
    {key: 'facility_name', label: 'ПРОМЫСЕЛ', rowspan: '2', colspan: '1'},
    {key: 'department_name', label: 'УЧАСТОК', rowspan: '2', colspan: '1'},
    {key: 'role_name', label: 'ДОЛЖНОСТЬ', rowspan: '2', colspan: '1'},
    {key: 'full_name', label: 'ФИО', rowspan: '2', colspan: '1'}
];

const VACATION_COLUMNS = [
    {key: 'norm_days', label: 'НОРМА', rowspan: '1', colspan: '1', direction: '', align: 'center'},
    {key: 'extra_days', label: 'ДОП.', rowspan: '1', colspan: '1', direction: '', align: 'center'},
    {key: 'unused_days', label: 'ОСТАТКИ', rowspan: '1', colspan: '1', direction: '', align: 'center'},
    {key: 'total_days', label: 'ИТОГО', rowspan: '1', colspan: '1', direction: '', align: 'center'}
];

const PERIODS_COLUMNS_BASE = [
    {key: 'start_date', label: 'С', rowspan: '1', colspan: '1', direction: '', align: 'center'},
    {key: 'end_date', label: 'ПО', rowspan: '1', colspan: '1', direction: '', align: 'center'},
    {key: 'calendar_days', label: 'календарных дней', rowspan: '1', colspan: '1', direction: 'vertical', align: 'center'},
    {key: 'holiday_days', label: 'праздничных дней', rowspan: '1', colspan: '1', direction: 'vertical', align: 'center'},
    {key: 'is_14_days_period', label: '14-ти дневный период', rowspan: '1', colspan: '1', direction: 'vertical', align: 'center'}
];
const PERIODS_COLUMNS = [];
for (let i = 0; i < PERIODS; i++) {
    PERIODS_COLUMNS_BASE.forEach(column => {
        PERIODS_COLUMNS.push({...column, key: `${column.key}_${i + 1}`});
    });
}

const VACATION_COLUMN = [{key: 'vacation', label: 'ОТПУСК', rowspan: '1', colspan: '4', align: 'center'}];

const period = {key: 'part', label: 'ПЕРИОД', rowspan: '1', colspan: '5', align: 'center'};
const PERIOD_COLUMNS = [];

for (let i = 0; i < PERIODS; i++) {
    const newPeriod = {...period, key: `${period.key}_${i + 1}`,label: `${period.label} ${i + 1}`}
    PERIOD_COLUMNS.push(newPeriod);
}

const ROW_COLUMNS = [...EMPLOYEES_COLUMNS, ...VACATION_COLUMNS, ...PERIODS_COLUMNS];


function isPrimitive(val) {
    return val === null || (typeof val !== 'object' && typeof val !== 'function');
}

function createTableHead() {
    const thead = document.createElement('thead');

    const tr1 = document.createElement('tr');
    const tr2 = document.createElement('tr');

    tr1.append(
        ...createHeaderCells(EMPLOYEES_COLUMNS),
        ...createHeaderCells(VACATION_COLUMN),
        ...createHeaderCells(PERIOD_COLUMNS)
    );

    tr2.append(
        ...createHeaderCells(VACATION_COLUMNS),
        ...createHeaderCells(PERIODS_COLUMNS)
    );

    thead.append(tr1, tr2);

    return thead;
}

function createHeaderCells(columns) {
    const ths = [];

    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.label;
        if (column.rowspan) th.rowSpan = column.rowspan;
        if (column.colspan) th.colSpan = column.colspan;
        if (column.direction) th.classList.add(`cell-${column.direction}`)
        if (column.align) th.classList.add(`cell-${column.align}`)
        ths.push(th);
    });

    return ths;
}

async function createTableBody() {
    const year = new Date().getFullYear();
    const tbody = document.createElement('tbody');

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getVacations(year)}`);

    if (!response.ok) {
        throw new Error(`Ошибка сервера ${response.status}`);
    }

    const dataJson = await response.json();
    const employeesVacationData = dataJson.data.map(data => new VacationData(data));
    employeesVacationData.forEach(vacationData => {
        const tr = createTableRow(vacationData);
        tbody.append(tr);
    });

    return tbody;
}

function createTableRow(vacationData) {
    const flatRow = flattenVacationData(vacationData);
    const tr = document.createElement('tr');

    ROW_COLUMNS.forEach(column => {
        const td = document.createElement('td');
        if (column.align) td.classList.add(`cell-${column.align}`);
        td.textContent = flatRow[column.key] ?? '';
        tr.append(td);
    });

    return tr;
}

function flattenVacationData(vacationData) {
    const flat = {};

    for (const [key, value] of Object.entries(vacationData)) {
        if (isPrimitive(value)) flat[key] = value;
    }

    flat.facility_name = vacationData.facility_short_name || vacationData.facility_name;
    flat.department_name = vacationData.department_short_name || vacationData.department_name;

    Object.assign(flat, vacationData.vacation_limits);

    const sortedVacations = sortVacationPeriods(vacationData.vacations);
    sortedVacations.forEach((period, index) => {
        const suffix = index + 1;
        for (const [key, value] of Object.entries(period)) {
            flat[`${key}_${suffix}`] = value;
        }
    });

    return flat;
}

function getPeriodIndexFromColumnKey(key) {
    const match = key.match(/_(\d+)$/);
    return match ? Number(match[1]) : null;
}

function sortVacationPeriods(vacations) {
    return [...(vacations ?? [])].sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return a.start_date.localeCompare(b.start_date);
    });
}

function createTableContainer() {
    const div = document.createElement('div');
    div.classList.add('table-container');

    return div;
}

async function getTable() {
    const tableContainer = createTableContainer();
    const table = document.createElement('table');
    const thead = createTableHead();
    const tbody = await createTableBody();


    tableContainer.append(table);
    table.classList.add('table');
    table.append(thead, tbody);

    return tableContainer;
}

async function initTableUI() {
    const page = DOM.getPage();

    const table = await getTable();
    page.append(table);
}

export async function init() {
    await initTableUI();
}