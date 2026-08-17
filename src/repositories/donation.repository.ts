import { PrismaClient, Donation, Prisma } from '@prisma/client';
import { BaseRepository, PaginatedResult } from './base.repository';

/**
 * Donation Repository
 * Database access for donations, with donor (Subscriber) and actor (User) relations.
 */
export interface DonationFilters {
  search?: string; // matches donor name / email (snapshot or linked subscriber)
  donorId?: string;
  status?: string;
  paymentType?: string;
  method?: string;
  startDate?: Date;
  endDate?: Date;
  /** Voided rows are excluded from every read path unless this is explicitly true (DARE2CARE-9 §2.5). */
  includeVoided?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Money crosses the wire as a STRING (ADR-0004 #6) — never cast a Prisma
 * Decimal to `number`. `Decimal.toFixed(2)` preserves exact precision; casting
 * through `Number(...)` is exactly defect #3 in ADR-0005's Consequences table.
 */
export interface DonationSummary {
  currency: string;
  totalReceived: string;
  countCompleted: number;
  monthToDate: string;
  yearToDate: string;
  pendingCount: number;
  byType: { paymentType: string; amount: string }[];
}

/**
 * ADR-0004 #2: relations to `User` are ALWAYS projected with an explicit
 * `select` — never `include: { x: true }` — because a bare include on `User`
 * serialises `passwordHash` into the API response. ADR-0004 #4: the actor
 * projection is `{ id, fullName }` only (no email/role), declared once here
 * and reused by every method that embeds an actor.
 */
const donorSelect = { select: { id: true, fullName: true, email: true } } as const;
const actorSelect = { select: { id: true, fullName: true } } as const;

/** Shared `include` for a single-item ("detail") donation response: donor + both actors. */
const detailInclude = {
  donor: donorSelect,
  recordedBy: actorSelect,
  voidedBy: actorSelect,
} as const;

/** Shared `include` for a subscriber-scoped list row: actors only, no donor (the scope already names it — ADR-0004 #1). */
const scopedListInclude = {
  recordedBy: actorSelect,
  voidedBy: actorSelect,
} as const;

export class DonationRepository extends BaseRepository<Donation> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'donation');
  }

  private buildBaseWhere(includeVoided = false): Prisma.DonationWhereInput {
    const where: Prisma.DonationWhereInput = { isDeleted: false };
    if (!includeVoided) where.voidedAt = null;
    return where;
  }

  async findAllFiltered(filters: DonationFilters = {}): Promise<PaginatedResult<Donation>> {
    const where = this.buildBaseWhere(filters.includeVoided);

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

  /**
   * Single-item ("detail") fetch. Self-describing per ADR-0004 #1: carries the
   * donor AND both actors. Excludes voided rows unless `includeVoided` is set.
   */
  async findByIdWithRelations(id: string, includeVoided = false): Promise<Donation | null> {
    return this.prisma.donation.findFirst({
      where: { id, ...this.buildBaseWhere(includeVoided) },
      include: detailInclude,
    });
  }

  /**
   * Fetch bypassing the voided filter — used internally by the void
   * operation itself, which must be able to see "already voided" (409)
   * rather than treat it as not-found. Still excludes legacy soft-deleted rows.
   */
  async findByIdForVoidCheck(id: string): Promise<Donation | null> {
    return this.prisma.donation.findFirst({ where: { id, isDeleted: false } });
  }

  /**
   * Scoped donation history for one subscriber (DARE2CARE-11's backing
   * endpoint). Scoped list rows omit `donor` — the URL already names the
   * subscriber (ADR-0004 #1) — but carry `recordedBy` / `voidedBy` so the
   * history table can render who recorded/voided each row without an N+1.
   */
  async findBySubscriberId(
    subscriberId: string,
    options: { includeVoided?: boolean; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<Donation>> {
    const where: Prisma.DonationWhereInput = {
      donorId: subscriberId,
      ...this.buildBaseWhere(options.includeVoided),
    };

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        include: scopedListInclude,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.donation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByStripePaymentIntentId(paymentIntentId: string): Promise<Donation | null> {
    return this.prisma.donation.findUnique({ where: { stripePaymentIntentId: paymentIntentId } });
  }

  async create(data: Prisma.DonationCreateInput | Partial<Donation>): Promise<Donation> {
    return this.prisma.donation.create({
      data: data as Prisma.DonationCreateInput,
      include: detailInclude,
    });
  }

  async update(id: string, data: Prisma.DonationUpdateInput): Promise<Donation> {
    return this.prisma.donation.update({
      where: { id },
      data,
      include: detailInclude,
    });
  }

  /**
   * The only correction path for money (DARE2CARE-9 §2.5). Never mutates
   * amount / receivedAt / periodMonth / status.
   */
  async voidDonation(
    id: string,
    data: { voidedAt: Date; voidedByUserId: string | null; voidReason: string }
  ): Promise<Donation> {
    return this.prisma.donation.update({
      where: { id },
      data: {
        voidedAt: data.voidedAt,
        voidedByUserId: data.voidedByUserId,
        voidReason: data.voidReason,
      },
      include: detailInclude,
    });
  }

  /**
   * Donor ids who have at least one row counting as "received" for a given
   * UTC period (DARE2CARE-13). One `groupBy` — never N+1, never a per-row JS
   * reduction. Matches the §0 predicate exactly: COMPLETED, not voided, not
   * soft-deleted, donor-linked, this exact period.
   */
  async findPaidDonorIdsForPeriod(period: string): Promise<Set<string>> {
    const rows = await this.prisma.donation.groupBy({
      by: ['donorId'],
      where: {
        donorId: { not: null },
        periodMonth: period,
        status: 'COMPLETED',
        voidedAt: null,
        isDeleted: false,
      },
    });

    return new Set(rows.map((r) => r.donorId).filter((id): id is string => Boolean(id)));
  }

  /**
   * Per-donor SUM/MAX of "received" donations for a period, for pledge
   * reconciliation (DARE2CARE-12). The aggregation happens in SQL via
   * `groupBy`; the caller combines this with the (small, dimension-sized)
   * active-subscriber list rather than reducing donation rows in JS.
   */
  async sumReceivedByDonorForPeriod(
    period: string
  ): Promise<Map<string, { total: Prisma.Decimal; lastReceivedAt: Date | null }>> {
    const rows = await this.prisma.donation.groupBy({
      by: ['donorId'],
      where: {
        donorId: { not: null },
        periodMonth: period,
        status: 'COMPLETED',
        voidedAt: null,
        isDeleted: false,
      },
      _sum: { amount: true },
      _max: { receivedAt: true },
    });

    const result = new Map<string, { total: Prisma.Decimal; lastReceivedAt: Date | null }>();
    for (const row of rows) {
      if (!row.donorId) continue;
      result.set(row.donorId, {
        total: row._sum.amount ?? new Prisma.Decimal(0),
        lastReceivedAt: row._max.receivedAt ?? null,
      });
    }
    return result;
  }

  /**
   * Aggregated figures for the finance dashboard (completed, non-voided donations only).
   */
  async summary(): Promise<DonationSummary> {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const completedWhere: Prisma.DonationWhereInput = {
      status: 'COMPLETED',
      isDeleted: false,
      voidedAt: null,
    };

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
      this.prisma.donation.count({ where: { status: 'PENDING', isDeleted: false, voidedAt: null } }),
      this.prisma.donation.groupBy({
        by: ['paymentType'],
        _sum: { amount: true },
        where: completedWhere,
      }),
    ]);

    const toAmountString = (d: Prisma.Decimal | null | undefined): string =>
      (d ?? new Prisma.Decimal(0)).toFixed(2);

    return {
      currency: 'PKR',
      totalReceived: toAmountString(allTime._sum.amount),
      countCompleted: allTime._count,
      monthToDate: toAmountString(mtd._sum.amount),
      yearToDate: toAmountString(ytd._sum.amount),
      pendingCount,
      byType: byTypeRaw.map((r) => ({ paymentType: r.paymentType, amount: toAmountString(r._sum.amount) })),
    };
  }
}
