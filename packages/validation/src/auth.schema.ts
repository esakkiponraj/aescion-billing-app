import { z } from 'zod';

export const LoginSchema = z.object({
  identifier: z.string().min(3, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterOwnerSchema = z
  .object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    mobileNumber: z.string().min(10, 'Valid 10-digit mobile number is required'),
    email: z.string().email('Valid email is required'),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric and underscores'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password is required')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword']
  });

export type RegisterOwnerInput = z.infer<typeof RegisterOwnerSchema>;
