import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class BranchService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      include: { registers: true },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }]
    });
  }

  async findOne(organizationId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId },
      include: { registers: true }
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(organizationId: string, userId: string, userName: string, data: {
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
  }) {
    const code = data.code.toUpperCase();
    const existing = await this.prisma.branch.findFirst({
      where: { organizationId, code }
    });
    if (existing) {
      throw new ConflictException(`A branch with code ${code} already exists.`);
    }

    const createdBranch = await this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          organizationId,
          name: data.name,
          code,
          address: data.address,
          city: data.city,
          state: data.state,
          phone: data.phone,
          isMain: false,
          isActive: true
        }
      });

      await tx.register.create({
        data: {
          organizationId,
          branchId: branch.id,
          name: `${branch.code}-REG-01`,
          code: 'REG-01',
          isActive: true
        }
      });

      await this.auditService.log({
        organizationId,
        branchId: branch.id,
        userId,
        userName,
        action: 'BRANCH_CREATED',
        entityType: 'BRANCH',
        entityId: branch.id,
        details: { name: branch.name, code: branch.code }
      });

      return branch;
    });

    this.eventsGateway.emitBranchUpdated(organizationId, createdBranch);
    return createdBranch;
  }

  async update(organizationId: string, id: string, userId: string, userName: string, data: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    isActive?: boolean;
  }) {
    const branch = await this.findOne(organizationId, id);

    const updated = await this.prisma.branch.update({
      where: { id: branch.id },
      data: {
        name: data.name || branch.name,
        address: data.address !== undefined ? data.address : branch.address,
        city: data.city !== undefined ? data.city : branch.city,
        state: data.state !== undefined ? data.state : branch.state,
        phone: data.phone !== undefined ? data.phone : branch.phone,
        isActive: data.isActive !== undefined ? data.isActive : branch.isActive
      },
      include: { registers: true }
    });

    await this.auditService.log({
      organizationId,
      branchId: branch.id,
      userId,
      userName,
      action: 'BRANCH_UPDATED',
      entityType: 'BRANCH',
      entityId: branch.id,
      details: data
    });

    this.eventsGateway.emitBranchUpdated(organizationId, updated);
    return updated;
  }

  async createRegister(organizationId: string, branchId: string, userId: string, userName: string, data: {
    name: string;
    code: string;
  }) {
    const branch = await this.findOne(organizationId, branchId);
    const code = data.code.toUpperCase();

    const register = await this.prisma.register.create({
      data: {
        organizationId,
        branchId: branch.id,
        name: data.name,
        code,
        isActive: true
      }
    });

    await this.auditService.log({
      organizationId,
      branchId: branch.id,
      userId,
      userName,
      action: 'REGISTER_CREATED',
      entityType: 'REGISTER',
      entityId: register.id,
      details: { name: register.name, code: register.code }
    });

    return register;
  }
}
