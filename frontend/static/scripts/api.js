export const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const API_ENDPOINTS = {
    getEmployees: "/employees",
    updateEmployee: (id) => `/employees/${id}`,
    generateSchedule: "/schedules/generate",
    getSchedule: (id, month) => `/schedules/${id}?month=${month}`,
    getSchedules: "/schedules",
    getScheduleStatus: (id) => `/schedules/status/${id}`,
    getFacility: "/facilities",
}