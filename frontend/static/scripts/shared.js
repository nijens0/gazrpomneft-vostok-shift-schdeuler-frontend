export class Employee {
    constructor(data) {
        this.activity = data.activity ?? `?`;
        this.can_replace_boss = data.can_replace_boss ?? `?`;
        this.can_work_night = data.can_work_night ?? `?`;
        this.department_name = data.department_name ?? `?`;
        this.facility_name = data.facility_name ?? `?`;
        this.full_name = data.full_name ?? `?`;
        this.rank = data.rank ?? `?`;
        this.role_name = data.role_name ?? `?`;
        this.senior = data.senior ?? `?`;
        this.tab_number = data.tab_number ?? `?`;
        this.tmc = data.tmc ?? `?`;
        this.work_method = data.work_method ?? `?`;
    }

    formatFullName() {
        let parts = this.full_name.split(' ');
        return `${parts[0]} ${parts[1].slice(0,1)}.${parts[2].slice(0,1)}.`;
    }
}