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

const FIRST_COLUMNS = [
    {key: 'tab_number', label: 'ТАБ.№', rowspan: '2', colspan: '1'},
    {key: 'facility_name', label: 'ПРОМЫСЕЛ', rowspan: '2', colspan: '1'},
    {key: 'department_name', label: 'УЧАСТОК', rowspan: '2', colspan: '1'},
    {key: 'role_name', label: 'ДОЛЖНОСТЬ', rowspan: '2', colspan: '1'},
    {key: 'full_name', label: 'ФИО', rowspan: '2', colspan: '1'},
    {key: 'vacation', label: 'ОТПУСК', rowspan: '1', colspan: '4', align: 'center'}
];

const FIRST_COLUMNS_PERIODS =
    {key: 'first_part', label: 'ПЕРИОД', rowspan: '1', colspan: '5', align: 'center'}

const SECOND_COLUMNS = [
    {key: '', label: 'НОРМА', rowspan: '1', colspan: '1', direction: 'horizontal'},
    {key: '', label: 'ДОП.', rowspan: '1', colspan: '1', direction: 'horizontal'},
    {key: '', label: 'ОСТАТКИ', rowspan: '1', colspan: '1', direction: 'horizontal'},
    {key: '', label: 'ИТОГО', rowspan: '1', colspan: '1', direction: 'horizontal'},
    {key: 'start_date', label: 'С', rowspan: '1', colspan: '1', direction: 'horizontal'},
    {key: 'calendar_days', label: 'ПО', rowspan: '1', colspan: '1', direction: 'horizontal'},
    {key: 'end_date', label: 'календарных дней', rowspan: '1', colspan: '1', direction: 'vertical'},
    {key: 'vacation_days', label: 'праздничных дней', rowspan: '1', colspan: '1', direction: 'vertical'},
    {key: 'is_14_days_period', label: '14-ти дневный период', rowspan: '1', colspan: '1', direction: 'vertical'},
]

function createTableHead() {
    const thead = document.createElement('thead');

    const tr1 = document.createElement('tr');
    const tr2 = document.createElement('tr');

    for (let i = 0; i < FIRST_COLUMNS.length; i++) {
        const th = document.createElement('th');
        th.textContent = FIRST_COLUMNS[i].label;
        th.rowSpan = FIRST_COLUMNS[i].rowspan;
        th.colSpan = FIRST_COLUMNS[i].colspan;
        tr1.append(th);
    }

    for (let i = 0; i < SECOND_COLUMNS.length; i++) {
        const th = document.createElement('th');
        th.textContent = SECOND_COLUMNS[i].label;
        th.rowSpan = SECOND_COLUMNS[i].rowspan;
        th.colSpan = SECOND_COLUMNS[i].colspan;
        if (SECOND_COLUMNS[i].direction === 'vertical') th.classList.add('cell-vertical');
        tr2.append(th);
    }

    thead.append(tr1,tr2);

    return thead
}

export function init() {

}