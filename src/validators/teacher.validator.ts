import { z } from 'zod';

/**
 * Teacher Request Validators
 * Schemas wrapped in { body, query, params } for the validate() middleware.
 */

const idParam = z.object({
  id: z.string().uuid('Invalid teacher ID format'),
});

const dateString = z
  .string()
  .transform((val) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return new Date(val + 'T00:00:00Z').toISOString();
    }
    return new Date(val).toISOString();
  });

const teacherFields = {
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .trim(),
  subject: z.string().min(2, 'Subject must be at least 2 characters').trim(),
  qualification: z.string().min(2, 'Qualification must be at least 2 characters').trim(),
  experience: z
    .number({ invalid_type_error: 'Experience must be a number' })
    .int('Experience must be a whole number')
    .min(0, 'Experience cannot be negative')
    .max(50, 'Experience seems unrealistic (max 50 years)'),
  isActive: z.boolean(),
};

export const createTeacherSchema = z.object({
  body: z.object({
    fullName: teacherFields.fullName,
    email: teacherFields.email,
    phoneNumber: teacherFields.phoneNumber,
    subject: teacherFields.subject,
    qualification: teacherFields.qualification,
    experience: teacherFields.experience,
    hireDate: dateString.optional(),
    isActive: teacherFields.isActive.optional().default(true),
  }),
});

export const updateTeacherSchema = z.object({
  body: z.object({
    fullName: teacherFields.fullName.optional(),
    email: teacherFields.email.optional(),
    phoneNumber: teacherFields.phoneNumber.optional(),
    subject: teacherFields.subject.optional(),
    qualification: teacherFields.qualification.optional(),
    experience: teacherFields.experience.optional(),
    hireDate: dateString.optional(),
    isActive: teacherFields.isActive.optional(),
  }),
  params: idParam,
});

export const teacherIdSchema = z.object({
  params: idParam,
});

export const teacherQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    subject: z.string().optional(),
    minExperience: z.coerce.number().int().min(0).optional(),
  }),
});
