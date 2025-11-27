import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyContact } from '../../database/entities/company-contact.entity';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { UpdateCompanyContactDto } from './dto/update-company-contact.dto';

@Injectable()
export class CompanyContactsService {
  constructor(
    @InjectRepository(CompanyContact)
    private readonly contactRepository: Repository<CompanyContact>,
  ) {}

  async create(createDto: CreateCompanyContactDto): Promise<CompanyContact> {
    // Si se marca como default, quitar default de otros contactos de la misma compañía
    if (createDto.isDefault) {
      await this.clearDefaultForCompany(createDto.companyId, createDto.projectId);
    }

    const contact = this.contactRepository.create(createDto);
    return await this.contactRepository.save(contact);
  }

  async findAll(companyId?: number, activeOnly: boolean = true): Promise<CompanyContact[]> {
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company')
      .leftJoinAndSelect('contact.project', 'project');

    if (activeOnly) {
      queryBuilder.where('contact.isActive = :isActive', { isActive: true });
    }

    if (companyId) {
      queryBuilder.andWhere('contact.companyId = :companyId', { companyId });
    }

    return await queryBuilder
      .orderBy('company.name', 'ASC')
      .addOrderBy('contact.isDefault', 'DESC')
      .addOrderBy('contact.businessName', 'ASC')
      .getMany();
  }

  async findByCompany(companyId: number): Promise<CompanyContact[]> {
    return await this.contactRepository.find({
      where: { companyId, isActive: true },
      relations: ['project'],
      order: { isDefault: 'DESC', businessName: 'ASC' },
    });
  }

  async findByProject(projectId: number): Promise<CompanyContact[]> {
    return await this.contactRepository.find({
      where: { projectId, isActive: true },
      relations: ['company'],
      order: { isDefault: 'DESC', businessName: 'ASC' },
    });
  }

  async findOne(id: number): Promise<CompanyContact> {
    const contact = await this.contactRepository.findOne({
      where: { contactId: id },
      relations: ['company', 'project'],
    });

    if (!contact) {
      throw new NotFoundException(`Contacto con ID ${id} no encontrado`);
    }

    return contact;
  }

  async findDefaultForCompany(companyId: number, projectId?: number): Promise<CompanyContact | null> {
    const where: any = { companyId, isDefault: true, isActive: true };
    if (projectId) {
      where.projectId = projectId;
    }

    return await this.contactRepository.findOne({
      where,
      relations: ['company', 'project'],
    });
  }

  async update(id: number, updateDto: UpdateCompanyContactDto): Promise<CompanyContact> {
    const contact = await this.findOne(id);

    // Si se marca como default, quitar default de otros contactos
    if (updateDto.isDefault && !contact.isDefault) {
      await this.clearDefaultForCompany(
        updateDto.companyId || contact.companyId,
        updateDto.projectId !== undefined ? updateDto.projectId : contact.projectId,
      );
    }

    Object.assign(contact, updateDto);
    return await this.contactRepository.save(contact);
  }

  async remove(id: number): Promise<void> {
    const contact = await this.findOne(id);
    contact.isActive = false;
    await this.contactRepository.save(contact);
  }

  async setAsDefault(id: number): Promise<CompanyContact> {
    const contact = await this.findOne(id);

    await this.clearDefaultForCompany(contact.companyId, contact.projectId);

    contact.isDefault = true;
    return await this.contactRepository.save(contact);
  }

  private async clearDefaultForCompany(companyId: number, projectId?: number | null): Promise<void> {
    const queryBuilder = this.contactRepository
      .createQueryBuilder()
      .update(CompanyContact)
      .set({ isDefault: false })
      .where('companyId = :companyId', { companyId });

    if (projectId) {
      queryBuilder.andWhere('projectId = :projectId', { projectId });
    } else {
      queryBuilder.andWhere('projectId IS NULL');
    }

    await queryBuilder.execute();
  }
}
