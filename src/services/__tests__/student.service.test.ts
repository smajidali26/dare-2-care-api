import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * DARE2CARE-57 — explicit update reconstruction (defence in depth).
 *
 * `updateStudent` used to forward its `studentData` parameter straight
 * through to the repository (`studentRepository.update(id, studentData)`).
 * These tests call the service function directly (no Express, no validate()
 * middleware) to prove the service itself — not just the middleware —
 * resists mass assignment and preserves falsy/null partial-update semantics.
 *
 * Mirrors DARE2CARE-56's subscriber/teacher tests.
 */
const mockFindById = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../repositories/student.repository', () => ({
  default: {
    findById: (...args: unknown[]) => mockFindById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { updateStudent } from '../student.service';

const EXISTING_STUDENT = {
  id: 'student-1',
  fullName: 'Existing Name',
  dateOfBirth: new Date('2015-01-01'),
  gender: 'female',
  guardianName: 'Existing Guardian',
  guardianPhone: '+1234567890',
  guardianEmail: 'guardian@example.com',
  schoolName: 'Existing School',
  grade: '5',
  isActive: true,
  isDeleted: false,
};

describe('updateStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue(EXISTING_STUDENT);
    mockUpdate.mockResolvedValue({ ...EXISTING_STUDENT });
  });

  describe('mass-assignment resistance', () => {
    it('does not forward undeclared real DB columns to the repository update call', async () => {
      await updateStudent('student-1', {
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
      await updateStudent('student-1', { isActive: false });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.isActive).toBe(false);
    });

    it('preserves guardianEmail: null (clearing the guardian email)', async () => {
      await updateStudent('student-1', { guardianEmail: null });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.guardianEmail).toBeNull();
    });

    it('preserves both falsy/null fields together in a single call', async () => {
      await updateStudent('student-1', {
        isActive: false,
        guardianEmail: null,
      });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted).toMatchObject({
        isActive: false,
        guardianEmail: null,
      });
    });

    it('leaves undeclared-in-this-call fields undefined (unchanged) rather than defaulting them', async () => {
      await updateStudent('student-1', { fullName: 'New Name' });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.guardianEmail).toBeUndefined();
      expect(persisted.isActive).toBeUndefined();
    });
  });

  describe('existing behaviour unchanged', () => {
    it('throws 404 when the student does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(updateStudent('missing-id', { fullName: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it.each([
      new Date(new Date().setFullYear(new Date().getFullYear() - 2)), // 2 years old
      new Date(new Date().setFullYear(new Date().getFullYear() - 26)), // 26 years old
    ])(
      'rejects an out-of-range dateOfBirth (age outside 3-25) with the same 400 error behaviour as before',
      async (dateOfBirth) => {
        await expect(
          updateStudent('student-1', { dateOfBirth })
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(mockUpdate).not.toHaveBeenCalled();
      }
    );

    it('accepts an in-range dateOfBirth (age within 3-25)', async () => {
      const dateOfBirth = new Date(new Date().setFullYear(new Date().getFullYear() - 10));
      await updateStudent('student-1', { dateOfBirth });
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not validate age when dateOfBirth is not being updated', async () => {
      await updateStudent('student-1', { fullName: 'New Name' });
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
