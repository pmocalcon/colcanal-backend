import { MaterialGroup } from './material-group.entity';
import { RequisitionItem } from './requisition-item.entity';
export declare class Material {
    materialId: number;
    code: string;
    description: string;
    groupId: number;
    materialGroup: MaterialGroup;
    requisitionItems: RequisitionItem[];
}
