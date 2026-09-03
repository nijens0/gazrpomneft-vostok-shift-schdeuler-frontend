import {API_BASE_URL, API_ENDPOINTS} from "./api.js";

const FIRST_COLUMNS = [
    {key: 'tab_number', label: 'ТАБ.№', rowspan: '2', colspan: '1'},
    {key: 'facility_name', label: 'ПРОМЫСЕЛ', rowspan: '2', colspan: '1'},
    {key: 'department_name', label: 'УЧАСТОК', rowspan: '2', colspan: '1'},
    {key: 'role_name', label: 'ДОЛЖНОСТЬ', rowspan: '2', colspan: '1'},
    {key: 'full_name', label: 'ФИО', rowspan: '2', colspan: '1'},
    {key: 'vacation', label: 'ОТПУСК', rowspan: '1', colspan: '4'},
    {key: 'first_part', label: 'ПЕРИОД 1', rowspan: '1', colspan: '4'},
    {key: 'second_part', label: 'ПЕРИОД 2', rowspan: '1', colspan: '4'},
    {key: 'third_part', label: 'ПЕРИОД 3', rowspan: '1', colspan: '4'},
    {key: 'fourth_part', label: 'ПЕРИОД 4', rowspan: '1', colspan: '4'},
]

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