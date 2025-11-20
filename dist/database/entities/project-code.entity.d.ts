import { Company } from './company.entity';
import { Project } from './project.entity';
import { Requisition } from './requisition.entity';
export declare class ProjectCode {
    codeId: number;
    companyId: number;
    projectId: number;
    code: string;
    company: Company;
    project: Project;
    requisitions: Requisition[];
}
