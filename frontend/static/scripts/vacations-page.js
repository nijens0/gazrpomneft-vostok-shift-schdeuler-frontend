import {API_BASE_URL, API_ENDPOINTS} from "./api.js";

class VacationData {
    constructor(data) {
        this.tab_number = data.tab_number;
        this.full_name = data.full_name;
        this.facility_name = data.facility_name;
        this.department_name = data.department_name;
        this.department_short_name = data.department_short_name;
        this.role_name = data.role_name;
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

const periods = 4;

const FIRST_COLUMNS_EMPLOYEE = [
    {key: 'tab_number', label: 'ТАБ.№', rowspan: '2', colspan: '1'},
    {key: 'facility_name', label: 'ПРОМЫСЕЛ', rowspan: '2', colspan: '1'},
    {key: 'department_name', label: 'УЧАСТОК', rowspan: '2', colspan: '1'},
    {key: 'role_name', label: 'ДОЛЖНОСТЬ', rowspan: '2', colspan: '1'},
    {key: 'full_name', label: 'ФИО', rowspan: '2', colspan: '1'}
];

const FIRST_COLUMNS_VACATIONS = [
    {key: 'norm_days', label: 'НОРМА', rowspan: '1', colspan: '1', direction: 'horizontal', align: 'center'},
    {key: 'extra_days', label: 'ДОП.', rowspan: '1', colspan: '1', direction: 'horizontal', align: 'center'},
    {key: 'unused_days', label: 'ОСТАТКИ', rowspan: '1', colspan: '1', direction: 'horizontal', align: 'center'},
    {key: 'total_days', label: 'ИТОГО', rowspan: '1', colspan: '1', direction: 'horizontal', align: 'center'}
];

const FIRST_COLUMNS_PERIODS = [
    {key: 'start_date', label: 'С', rowspan: '1', colspan: '1', direction: 'horizontal', align: 'center'},
    {key: 'calendar_days', label: 'ПО', rowspan: '1', colspan: '1', direction: 'horizontal', align: 'center'},
    {key: 'end_date', label: 'календарных дней', rowspan: '1', colspan: '1', direction: 'vertical', align: 'center'},
    {key: 'vacation_days', label: 'праздничных дней', rowspan: '1', colspan: '1', direction: 'vertical', align: 'center'},
    {key: 'is_14_days_period', label: '14-ти дневный период', rowspan: '1', colspan: '1', direction: 'vertical', align: 'center'}
];

const SECOND_COLUMNS_VACATION = {key: 'vacation', label: 'ОТПУСК', rowspan: '1', colspan: '4', align: 'center'};

const SECOND_COLUMNS_PERIODS = {key: 'first_part', label: 'ПЕРИОД', rowspan: '1', colspan: '5', align: 'center'}


function isPrimitive(val) {
    return val === null || (typeof val !== 'object' && typeof val !== 'function');
}

function createTableHead() {
    const thead = document.createElement('thead');

    const tr1 = document.createElement('tr');
    const tr2 = document.createElement('tr');

    tr1.append(
        ...createPartOfTableHead(EMPLOYEES_COLUMNS),
        ...createPartOfTableHead(VACATION_COLUMN),
        ...createPartOfTableHead(PERIOD_COLUMNS)
    );

    tr2.append(
        ...createPartOfTableHead(VACATION_COLUMNS),
        ...createPartOfTableHead(PERIODS_COLUMNS)
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

    try {
        const data = await fetch(`${API_BASE_URL}${API_ENDPOINTS.getVacations(year)}`);
        const dataJson = await data.json();
        console.log(dataJson);
        dataJson.data.map(data => new VacationData(data));


        dataJson.data.forEach(vacationData => {
            const tr = document.createElement('tr');


        });
    } catch (error) {
        console.log(`Не удалось получить отпуска ${error}`);
        throw new Error(error);
    }

    return tbody;
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