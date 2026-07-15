export class Employee {
    constructor(data) {
        this.id = data.id;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.middleName = data.middle_name;
        this.workMethod = data.work_method;
        this.departmentId = data.department_id;
        this.roleId = data.role_id;
    }

    getFullName() {
        return `${this.lastName} ${this.firstName.slice(0,1)}. ${this.middleName.slice(0,1)}.`;
    }
}