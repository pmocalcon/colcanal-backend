import { Company } from './company.entity';
import { Project } from './project.entity';
import { RequisitionSequence } from './requisition-sequence.entity';
export declare class RequisitionPrefix {
    prefixId: number;
    companyId: number;
    projectId: number;
    prefix: string;
    company: Company;
    project: Project;
    requisitionSequence: RequisitionSequence;
}
