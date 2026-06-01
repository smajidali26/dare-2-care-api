import { PrismaClient, Donation, Prisma } from '@prisma/client';
import { BaseRepository, PaginatedResult } from './base.repository';

/**
 * Donation Repository
 * Database access for donations, with donor (Subscriber) relation.
 */
export interface DonationFilters {
  search?: string; // matches donor name / email (snapshot or linked subscriber)
  donorId?: string;
  status?: string;
  paymentType?: string;
  method?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface DonationSummary {
  currency: string;
  totalReceived: number;
  countCompleted: number;
  monthToDate: number;
  yearToDate: number;
  pendingCount: number;
  byType: { paymentType: string; amount: number }[];
}

const donorSelect = { select: { id: true, fullName: true, email: true } } as const;

export class DonationRepository extends BaseRepository<Donation> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'donation');
  }

  async findAllFiltered(filters: DonationFilters = {}): Promise<PaginatedResult<Donation>> {
    const where: Prisma.DonationWhereInput = { isDeleted: false };

    if (filters.donorId) where.donorId = filters.donorId;
    if (filters.status) where.status = filters.status as Prisma.EnumPaymentStatusFilter['equals'];
    if (filters.paymentType) where.paymentType = filters.paymentType as Prisma.EnumPaymentTypeFilter['equals'];
    if (filters.method) where.method = filters.method as Prisma.EnumPaymentMethodFilter['equals'];

    if (filters.search) {
      where.OR = [
        { donorName: { contains: filters.search, mode: 'insensitive' } },
        { donorEmail: { contains: filters.search, mode: 'insensitive' } },
        { donor: { is: { fullName: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.receivedAt = {};
      if (filters.startDate) where.receivedAt.gte = filters.startDate;
      if (filters.endDate) where.receivedAt.lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        include: { donor: donorSelect },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdWithDonor(id: string): Promise<Donation | null> {
    return this.prisma.donation.findFirst({
      where: { id, isDeleted: false },
      include: { donor: donorSelect },
    });
  }

  async findByStripePaymentIntentId(paymentIntentId: string): Promise<Donation | null> {
    return this.prisma.donation.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
  }

  async create(data: Prisma.DonationCreateInput | Partial<Donation>): Promise<Donation> {
    return this.prisma.donation.create({
      data: data as Prisma.DonationCreateInput,
      include: { donor: donorSelect },
    });
  }

  async update(id: string, data: Prisma.DonationUpdateInput): Promise<Donation> {
    return this.prisma.donation.update({
      where: { id },
      data,
      include: { donor: donorSelect },
    });
  }

  /**
   * Aggregated figures for the finance dashboard (completed donations only).
   */
  async summary(): Promise<DonationSummary> {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const completedWhere: Prisma.DonationWhereInput = { status: 'COMPLETED', isDeleted: false };

    const [allTime, mtd, ytd, pendingCount, byTypeRaw] = await Promise.all([
      this.prisma.donation.aggregate({ _sum: { amount: true }, _count: true, where: completedWhere }),
      this.prisma.donation.aggregate({
        _sum: { amount: true },
        where: { ...completedWhere, receivedAt: { gte: startOfMonth } },
      }),
      this.prisma.donation.aggregate({
        _sum: { amount: true },
        where: { ...completedWhere, receivedAt: { gte: startOfYear } },
      }),
      this.prisma.donation.count({ where: { status: 'PENDING', isDeleted: false } }),
      this.prisma.donation.groupBy({
        by: ['paymentType'],
        _sum: { amount: true },
        where: completedWhere,
      }),
    ]);

    return {
      currency: 'PKR',
      totalReceived: Number(allTime._sum.amount ?? 0),
      countCompleted: allTime._count,
      monthToDate: Number(mtd._sum.amount ?? 0),
      yearToDate: Number(ytd._sum.amount ?? 0),
      pendingCount,
      byType: byTypeRaw.map((r) => ({ paymentType: r.paymentType, amount: Number(r._sum.amount ?? 0) })),
    };
  }
}
