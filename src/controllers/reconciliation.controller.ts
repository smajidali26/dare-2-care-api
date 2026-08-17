import { Request, Response } from 'express';
import { ReconciliationService } from '../services/reconciliation.service';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Reconciliation Controller (DARE2CARE-12)
 */
export class ReconciliationController {
  constructor(private reconciliationService: ReconciliationService) {}

  /**
   * GET /api/admin/finance/reconciliation
   */
  get = asyncHandler(async (req: Request, res: Response) => {
    const { period, status, page, limit } = req.query;

    const result = await this.reconciliationService.reconcile({
      period: period as string | undefined,
      status: status as 'PAID' | 'PARTIAL' | 'UNPAID' | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: {
        period: result.period,
        currency: result.currency,
        totals: result.totals,
        rows: result.rows,
      },
      meta: result.meta,
    });
  });
}
