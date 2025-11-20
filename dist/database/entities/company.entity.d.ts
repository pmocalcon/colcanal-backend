import { Project } from './project.entity';
import { OperationCenter } from './operation-center.entity';
import { ProjectCode } from './project-code.entity';
import { RequisitionPrefix } from './requisition-prefix.entity';
export declare class Company {
    companyId: number;
    name: string;
    projects: Project[];
    operationCenters: OperationCenter[];
    projectCodes: ProjectCode[];
    requisitionPrefixes: RequisitionPrefix[];
}
