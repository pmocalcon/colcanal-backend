import { Repository } from 'typeorm';
import { Company } from '../../database/entities/company.entity';
import { Project } from '../../database/entities/project.entity';
import { Material } from '../../database/entities/material.entity';
import { MaterialGroup } from '../../database/entities/material-group.entity';
import { RequisitionStatus } from '../../database/entities/requisition-status.entity';
import { OperationCenter } from '../../database/entities/operation-center.entity';
import { ProjectCode } from '../../database/entities/project-code.entity';
export declare class MasterDataController {
    private readonly companyRepository;
    private readonly projectRepository;
    private readonly materialRepository;
    private readonly materialGroupRepository;
    private readonly statusRepository;
    private readonly operationCenterRepository;
    private readonly projectCodeRepository;
    constructor(companyRepository: Repository<Company>, projectRepository: Repository<Project>, materialRepository: Repository<Material>, materialGroupRepository: Repository<MaterialGroup>, statusRepository: Repository<RequisitionStatus>, operationCenterRepository: Repository<OperationCenter>, projectCodeRepository: Repository<ProjectCode>);
    getCompanies(): Promise<{
        data: Company[];
        total: number;
    }>;
    getProjects(companyId?: string): Promise<{
        data: Project[];
        total: number;
    }>;
    getOperationCenters(): Promise<{
        data: OperationCenter[];
        total: number;
    }>;
    getProjectCodes(): Promise<{
        data: ProjectCode[];
        total: number;
    }>;
    getMaterialGroups(): Promise<{
        data: MaterialGroup[];
        total: number;
    }>;
    getMaterials(groupId?: string): Promise<{
        data: Material[];
        total: number;
    }>;
    getStatuses(): Promise<{
        data: RequisitionStatus[];
        total: number;
    }>;
}
