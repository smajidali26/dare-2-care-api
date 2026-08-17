import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * DARE2CARE-56 — explicit update reconstruction (defence in depth).
 *
 * `updateSubscriber` used to do `const updateData: any = { ...subscriberData }`
 * and forward it verbatim to the repository. These tests call the service
 * function directly (no Express, no validate() middleware) to prove the
 * service itself — not just the middleware — resists mass assignment and
 * preserves falsy/null partial-update semantics.
 */
const mockFindById = vi.fn();
const mockEmailExists = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../repositories/subscriber.repository', () => ({
  default: {
    findById: (...args: unknown[]) => mockFindById(...args),
    emailExists: (...args: unknown[]) => mockEmailExists(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { updateSubscriber } from '../subscriber.service';

const EXISTING_SUBSCRIBER = {
  id: 'sub-1',
  email: 'existing@example.com',
  fullName: 'Existing Name',
  isDeleted: false,
};

describe('updateSubscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue(EXISTING_SUBSCRIBER);
    mockUpdate.mockResolvedValue({ ...EXISTING_SUBSCRIBER });
  });

  describe('mass-assignment resistance', () => {
    it('does not forward undeclared real DB columns to the repository update call', async () => {
      await updateSubscriber('sub-1', {
        fullName: 'New Name',
        // undeclared real columns an attacker (or a bypassed validator) might send:
        isDeleted: true,
        id: 'attacker-supplied-uuid',
        createdAt: new Date('2000-01-01'),
      } as any);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted).not.toHaveProperty('isDeleted');
      expect(persisted).not.toHaveProperty('id');
      expect(persisted).not.toHaveProperty('createdAt');
      expect(persisted.fullName).toBe('New Name');
    });
  });

  describe('falsy/null round-trip', () => {
    it('preserves isActive: false (does not strip/default it to true)', async () => {
      await updateSubscriber('sub-1', { isActive: false });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.isActive).toBe(false);
    });

    it('preserves profileImageUrl: null (clearing the image)', async () => {
      await updateSubscriber('sub-1', { profileImageUrl: null });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.profileImageUrl).toBeNull();
    });

    it('preserves managementRole: null (clearing the role)', async () => {
      await updateSubscriber('sub-1', { managementRole: null });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.managementRole).toBeNull();
    });

    it('preserves displayOrder: 0 (does not strip a falsy zero)', async () => {
      await updateSubscriber('sub-1', { displayOrder: 0 });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.displayOrder).toBe(0);
    });

    it('preserves subscriptionEndDate: null (clearing the end date)', async () => {
      await updateSubscriber('sub-1', { subscriptionEndDate: null });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.subscriptionEndDate).toBeNull();
    });

    it('all five falsy/null fields round-trip correctly together in a single call', async () => {
      await updateSubscriber('sub-1', {
        isActive: false,
        profileImageUrl: null,
        managementRole: null,
        displayOrder: 0,
        subscriptionEndDate: null,
      });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted).toMatchObject({
        isActive: false,
        profileImageUrl: null,
        managementRole: null,
        displayOrder: 0,
        subscriptionEndDate: null,
      });
    });
  });

  describe('monthlyDonationAmount conversion', () => {
    it('converts a provided monthlyDonationAmount into a Prisma.Decimal instance', async () => {
      await updateSubscriber('sub-1', { monthlyDonationAmount: 2500 });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.monthlyDonationAmount).toBeInstanceOf(Prisma.Decimal);
      expect((persisted.monthlyDonationAmount as Prisma.Decimal).toString()).toBe('2500');
    });

    it('leaves monthlyDonationAmount undefined in the update payload when not provided', async () => {
      await updateSubscriber('sub-1', { fullName: 'New Name' });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.monthlyDonationAmount).toBeUndefined();
    });
  });

  describe('existing behaviour unchanged', () => {
    it('throws 404 when the subscriber does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(updateSubscriber('missing-id', { fullName: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws 409 when updating to an email that already belongs to another subscriber', async () => {
      mockEmailExists.mockResolvedValue(true);
      await expect(
        updateSubscriber('sub-1', { email: 'taken@example.com' })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('does not check for duplicates when the email is unchanged', async () => {
      await updateSubscriber('sub-1', { email: EXISTING_SUBSCRIBER.email });
      expect(mockEmailExists).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it.each([0, 29, -1, 100])(
      'rejects an out-of-range paymentDayOfMonth (%i) with the same 400 error behaviour as before',
      async (day) => {
        await expect(
          updateSubscriber('sub-1', { paymentDayOfMonth: day })
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(mockUpdate).not.toHaveBeenCalled();
      }
    );

    it.each([1, 15, 28])(
      'accepts an in-range paymentDayOfMonth (%i)',
      async (day) => {
        await updateSubscriber('sub-1', { paymentDayOfMonth: day });
        expect(mockUpdate).toHaveBeenCalledTimes(1);
      }
    );
  });
});
