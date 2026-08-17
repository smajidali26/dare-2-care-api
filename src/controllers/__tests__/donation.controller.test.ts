import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DonationController } from '../donation.controller';

/**
 * DonationController — defense-in-depth checks that don't depend on the Zod
 * validator layer: `validate()` middleware never strips unknown keys off
 * `req.body`, so the controller itself must not blindly spread `req.body`
 * into the service. These tests simulate a client that sends extra/forbidden
 * fields directly and prove the controller never forwards them.
 */
function buildRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('DonationController.create — §2.4 status/currency cannot reach the service via a body spread', () => {
  it('forwards only the whitelisted fields even when the client sends status/currency', async () => {
    const service = { record: vi.fn().mockResolvedValue({ id: 'd1' }) };
    const controller = new DonationController(service as any);

    const req: any = {
      body: {
        amount: '500.00',
        donorName: 'Jane',
        status: 'REFUNDED', // must never reach the service
        currency: 'USD', // must never reach the service
      },
      user: { userId: 'user-1' },
    };
    const res = buildRes();

    await controller.create(req, res, vi.fn());

    const forwarded = service.record.mock.calls[0][0];
    expect(forwarded).not.toHaveProperty('status');
    expect(forwarded).not.toHaveProperty('currency');
    expect(forwarded.amount).toBe('500.00');
    expect(forwarded.recordedByUserId).toBe('user-1');
  });
});

describe('DonationController.void — voidedByUserId can never be spoofed via the body', () => {
  it('always sources voidedByUserId from req.user, ignoring any value in the body', async () => {
    const service = { voidDonation: vi.fn().mockResolvedValue({ id: 'd1', voidedAt: new Date() }) };
    const controller = new DonationController(service as any);

    const req: any = {
      params: { id: 'd1' },
      body: { voidReason: 'Mis-keyed amount', voidedByUserId: 'attacker-supplied-id' },
      user: { userId: 'real-authenticated-user' },
    };
    const res = buildRes();

    await controller.void(req, res, vi.fn());

    expect(service.voidDonation).toHaveBeenCalledWith('d1', {
      voidReason: 'Mis-keyed amount',
      voidedByUserId: 'real-authenticated-user',
    });
  });
});

describe('DonationController.refund — passes the manual flag through explicitly', () => {
  it('defaults manual to false when absent', async () => {
    const service = { refund: vi.fn().mockResolvedValue({ id: 'd1', status: 'REFUNDED' }) };
    const controller = new DonationController(service as any);
    const req: any = { params: { id: 'd1' }, body: {} };
    const res = buildRes();

    await controller.refund(req, res, vi.fn());

    expect(service.refund).toHaveBeenCalledWith('d1', { manual: false });
  });

  it('passes manual:true through when set', async () => {
    const service = { refund: vi.fn().mockResolvedValue({ id: 'd1', status: 'REFUNDED' }) };
    const controller = new DonationController(service as any);
    const req: any = { params: { id: 'd1' }, body: { manual: true } };
    const res = buildRes();

    await controller.refund(req, res, vi.fn());

    expect(service.refund).toHaveBeenCalledWith('d1', { manual: true });
  });
});
