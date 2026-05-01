import { z } from 'zod';

/**
 * Subscriber Request Validators
 * Schemas wrapped in { body, query, params } for the validate() middleware.
 */

const idParam = z.object({
  id: z.string().uuid('Invalid subscriber ID format'),
});

const dateString = z
  .string()
  .transform((val) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return new Date(val + 'T00:00:00Z').toISOString();
    }
    return new Date(val).toISOString();
  });

const subscriberFields = {
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .trim(),
  monthlyDonationAmount: z
    .number({ invalid_type_error: 'Monthly donation amount must be a number' })
    .positive('Monthly donation amount must be positive')
    .multipleOf(0.01, 'Invalid decimal places'),
  paymentDayOfMonth: z
    .number({ invalid_type_error: 'Payment day must be a number' })
    .int('Payment day must be an integer')
    .min(1, 'Payment day must be between 1 and 28')
    .max(28, 'Payment day must be between 1 and 28'),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  isActive: z.boolean(),
  subscriberType: z.enum(['PERMANENT', 'GENERAL', 'SUPPORTER']),
  paymentType: z.enum(['DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY']),
  profileImageUrl: z.string().url('Invalid URL format').nullable(),
  isManagement: z.boolean(),
  managementRole: z.string().nullable(),
  managementBio: z.string().nullable(),
  displayOrder: z.number().int(),
};

export const createSubscriberSchema = z.object({
  body: z.object({
    fullName: subscriberFields.fullName,
    email: subscriberFields.email,
    phoneNumber: subscriberFields.phoneNumber,
    monthlyDonationAmount: subscriberFields.monthlyDonationAmount,
    paymentDayOfMonth: subscriberFields.paymentDayOfMonth.optional().default(1),
    emailNotifications: subscriberFields.emailNotifications.optional().default(true),
    smsNotifications: subscriberFields.smsNotifications.optional().default(true),
    isActive: subscriberFields.isActive.optional().default(true),
    subscriptionStartDate: dateString.optional(),
    subscriptionEndDate: dateString.optional().nullable(),
    subscriberType: subscriberFields.subscriberType,
    paymentType: subscriberFields.paymentType,
    profileImageUrl: subscriberFields.profileImageUrl.optional(),
    isManagement: subscriberFields.isManagement.optional().default(false),
    managementRole: subscriberFields.managementRole.optional(),
    managementBio: subscriberFields.managementBio.optional(),
    displayOrder: subscriberFields.displayOrder.optional().default(0),
  }),
});

export const updateSubscriberSchema = z.object({
  body: z.object({
    fullName: subscriberFields.fullName.optional(),
    email: subscriberFields.email.optional(),
    phoneNumber: subscriberFields.phoneNumber.optional(),
    monthlyDonationAmount: subscriberFields.monthlyDonationAmount.optional(),
    paymentDayOfMonth: subscriberFields.paymentDayOfMonth.optional(),
    emailNotifications: subscriberFields.emailNotifications.optional(),
    smsNotifications: subscriberFields.smsNotifications.optional(),
    isActive: subscriberFields.isActive.optional(),
    subscriptionStartDate: dateString.optional(),
    subscriptionEndDate: dateString.optional().nullable(),
    subscriberType: subscriberFields.subscriberType.optional(),
    paymentType: subscriberFields.paymentType.optional(),
    profileImageUrl: subscriberFields.profileImageUrl.optional(),
    isManagement: subscriberFields.isManagement.optional(),
    managementRole: subscriberFields.managementRole.optional(),
    managementBio: subscriberFields.managementBio.optional(),
    displayOrder: subscriberFields.displayOrder.optional(),
  }),
  params: idParam,
});

export const subscriberIdSchema = z.object({
  params: idParam,
});

export const subscriberQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    isManagement: z.coerce.boolean().optional(),
    paymentDayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
    subscriberType: z.enum(['PERMANENT', 'GENERAL', 'SUPPORTER']).optional(),
    paymentType: z.enum(['DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY']).optional(),
  }),
});
