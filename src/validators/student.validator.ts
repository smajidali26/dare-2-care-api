import { z } from 'zod';

/**
 * Student Request Validators
 * Schemas wrapped in { body, query, params } for the validate() middleware.
 */

const idParam = z.object({
  id: z.string().uuid('Invalid student ID format'),
});

const dateString = z
  .string()
  .transform((val) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return new Date(val + 'T00:00:00Z').toISOString();
    }
    return new Date(val).toISOString();
  });

const studentFields = {
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  gender: z.string().min(1, 'Gender is required').trim(),
  guardianName: z.string().min(2, 'Guardian name must be at least 2 characters').trim(),
  guardianPhone: z
    .string()
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .trim(),
  guardianEmail: z.string().email('Invalid email format').toLowerCase().trim().nullable(),
  schoolName: z.string().min(2, 'School name must be at least 2 characters').trim(),
  grade: z.string().min(1, 'Grade is required').trim(),
  isActive: z.boolean(),
};

export const createStudentSchema = z.object({
  body: z.object({
    fullName: studentFields.fullName,
    dateOfBirth: dateString,
    gender: studentFields.gender,
    guardianName: studentFields.guardianName,
    guardianPhone: studentFields.guardianPhone,
    guardianEmail: studentFields.guardianEmail.optional(),
    schoolName: studentFields.schoolName,
    grade: studentFields.grade,
    enrollmentDate: dateString.optional(),
    isActive: studentFields.isActive.optional().default(true),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    fullName: studentFields.fullName.optional(),
    dateOfBirth: dateString.optional(),
    gender: studentFields.gender.optional(),
    guardianName: studentFields.guardianName.optional(),
    guardianPhone: studentFields.guardianPhone.optional(),
    guardianEmail: studentFields.guardianEmail.optional(),
    schoolName: studentFields.schoolName.optional(),
    grade: studentFields.grade.optional(),
    enrollmentDate: dateString.optional(),
    isActive: studentFields.isActive.optional(),
  }),
  params: idParam,
});

export const studentIdSchema = z.object({
  params: idParam,
});

export const studentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    gender: z.string().optional(),
    grade: z.string().optional(),
    schoolName: z.string().optional(),
  }),
});
