import { Company } from './company.entity';
import { OperationCenter } from './operation-center.entity';
import { ProjectCode } from './project-code.entity';
import { RequisitionPrefix } from './requisition-prefix.entity';
export declare class Project {
    projectId: number;
    companyId: number;
    name: string;
    company: Company;
    operationCenters: OperationCenter[];
    projectCodes: ProjectCode[];
    requisitionPrefixes: RequisitionPrefix[];
}
