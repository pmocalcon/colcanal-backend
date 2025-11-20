import { CreateRequisitionItemDto } from './create-requisition-item.dto';
export declare class CreateRequisitionDto {
    companyId: number;
    projectId?: number;
    obra?: string;
    codigoObra?: string;
    items: CreateRequisitionItemDto[];
}
