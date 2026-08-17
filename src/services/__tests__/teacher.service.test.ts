import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * DARE2CARE-56 — explicit update reconstruction (defence in depth).
 *
 * `updateTeacher` used to forward its `teacherData` parameter straight
 * through to the repository (`teacherRepository.update(id, teacherData)`).
 * These tests call the service function directly (no Express, no validate()
 * middleware) to prove the service itself — not just the middleware —
 * resists mass assignment and preserves falsy partial-update semantics.
 */
const mockFindById = vi.fn();
const mockEmailExists = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../repositories/teacher.repository', () => ({
  default: {
    findById: (...args: unknown[]) => mockFindById(...args),
    emailExists: (...args: unknown[]) => mockEmailExists(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { updateTeacher } from '../teacher.service';

const EXISTING_TEACHER = {
  id: 'teacher-1',
  email: 'existing@example.com',
  fullName: 'Existing Name',
  isDeleted: false,
};

describe('updateTeacher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue(EXISTING_TEACHER);
    mockUpdate.mockResolvedValue({ ...EXISTING_TEACHER });
  });

  describe('mass-assignment resistance', () => {
    it('does not forward undeclared real DB columns to the repository update call', async () => {
      await updateTeacher('teacher-1', {
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

  describe('falsy round-trip', () => {
    it('preserves isActive: false (does not strip/default it to true)', async () => {
      await updateTeacher('teacher-1', { isActive: false });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.isActive).toBe(false);
    });

    it('preserves experience: 0 (does not strip a falsy zero)', async () => {
      await updateTeacher('teacher-1', { experience: 0 });
      const persisted = mockUpdate.mock.calls[0][1];
      expect(persisted.experience).toBe(0);
    });
  });

  describe('existing behaviour unchanged', () => {
    it('throws 404 when the teacher does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(updateTeacher('missing-id', { fullName: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws 409 when updating to an email that already belongs to another teacher', async () => {
      mockEmailExists.mockResolvedValue(true);
      await expect(
        updateTeacher('teacher-1', { email: 'taken@example.com' })
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('does not check for duplicates when the email is unchanged', async () => {
      await updateTeacher('teacher-1', { email: EXISTING_TEACHER.email });
      expect(mockEmailExists).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it.each([-1, 51, 100])(
      'rejects an out-of-range experience (%i) with the same 400 error behaviour as before',
      async (experience) => {
        await expect(
          updateTeacher('teacher-1', { experience })
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(mockUpdate).not.toHaveBeenCalled();
      }
    );

    it.each([0, 25, 50])('accepts an in-range experience (%i)', async (experience) => {
      await updateTeacher('teacher-1', { experience });
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
