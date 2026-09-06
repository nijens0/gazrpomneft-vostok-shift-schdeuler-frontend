export const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const API_ENDPOINTS = {
    getEmployees: "/employees",
    searchEmployees: (query) => `/employees?search=${query}`,
    updateEmployee: (tabNumber) => `/employees/${tabNumber}`,
    deleteEmployee: (tabNumber) => `/employees/${tabNumber}`,
    importEmployees: "/employees/upload",
    generateSchedule: "/schedules/generate",
    getSchedule: (id, month) => `/schedules/${id}?month=${month}`,
    getSchedules: "/schedules",
    getScheduleStatus: (id) => `/schedules/status/${id}`,
    getFacilities: "/facilities",
    getDepartments: (facilityId) => `/facilities/${facilityId}/departments`,
    getVacations: (year) => `/vacations?year=${year}`,
    addVacation: "/vacations",
    searchVacation: (year, query) => `/vacations?year=${year}&tab_number=${query}`,
    updateVacation: (id) => `/vacations/${id}`,
    deleteVacation: (id) => `/vacations/${id}`
}