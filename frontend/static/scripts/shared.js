export class Employee {
    constructor(data) {
        this.full_name = data.full_name ?? ``;
        this.tab_number = data.tab_number ?? ``;
        this.gender = data.gender ?? ``;
        this.role_name = data.role_name ?? ``;
        this.facility_name = data.facility_name ?? ``;
        this.department_name = data.department_name ?? ``;
        this.work_method = data.work_method ?? ``;
        this.base_city = data.base_city ?? ``;
        this.gathering_point = data.gathering_point ?? ``;
        this.rank = data.rank ?? ``;
        this.personnel_subdivision = data.personnel_subdivision ?? ``;
        this.activity = data.activity ?? ``;
        this.can_work_night = data.can_work_night ?? ``;
        this.senior = data.senior ?? ``;
        this.can_replace_boss = data.can_replace_boss ?? ``;
        this.can_replace_senior = data.can_replace_senior ?? ``;
        this.tmc = data.tmc ?? ``;
    }

}