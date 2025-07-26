// src/lib/security/validation.ts
// Input validation and sanitization utilities

import { z, ZodIssue } from 'zod';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

// UPDATED: User registration schema with secret questions
export const registerSchema = z.object({
  username: z.string()
    .min(4, 'Username must be at least 4 characters')
    .max(13, 'Username must be 13 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform(val => val.toLowerCase().trim()),
  
  email: z.string()
    .email('Invalid email address')
    .max(100, 'Email too long')
    .transform(val => val.toLowerCase().trim()),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  birthday: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine((date) => {
      const birthDate = new Date(date);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 13); // Minimum age 13
      return birthDate <= minAge;
    }, 'You must be at least 13 years old'),

  // NEW: Secret question fields
  secretQuestionId: z.number()
    .int('Invalid question ID')
    .positive('Please select a security question'),
  
  secretAnswer: z.string()
    .min(1, 'Security answer is required')
    .max(255, 'Answer too long')
    .transform(val => val.trim())
});

// Login schema
export const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username required')
    .max(13, 'Invalid username')
    .transform(val => val.toLowerCase().trim()),
  
  password: z.string()
    .min(1, 'Password required')
    .max(50, 'Invalid password')
});

// NEW: Forgot password schema
export const forgotPasswordSchema = z.object({
  username: z.string()
    .min(1, 'Username required')
    .max(13, 'Invalid username')
    .transform(val => val.toLowerCase().trim()),
  
  secretAnswer: z.string()
    .min(1, 'Security answer required')
    .max(255, 'Answer too long')
    .transform(val => val.trim()),
  
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

// Announcement schema
export const announcementSchema = z.object({
  type: z.enum(['event', 'update', 'maintenance']),
  title: z.string()
    .min(1, 'Title required')
    .max(255, 'Title too long')
    .transform(val => val.trim()),
  description: z.string()
    .min(1, 'Description required')
    .max(1000, 'Description too long')
    .transform(val => val.trim()),
  priority: z.number().int().min(0).max(999).default(0)
});

// Password update schema
export const passwordUpdateSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password too long')
});

// NEW: Secret question update schema
export const secretQuestionUpdateSchema = z.object({
  secretQuestionId: z.number().int().positive(),
  secretAnswer: z.string()
    .min(1, 'Answer required')
    .max(255, 'Answer too long')
    .transform(val => val.trim())
});

// NEW: Admin user update schemas
export const adminUpdateUserSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(6).max(50).optional(),
  nxAmount: z.number().int().optional(),
  banStatus: z.number().int().min(0).max(1).optional()
});

// NEW: Character update schema
export const characterUpdateSchema = z.object({
  characterId: z.number().int().positive(),
  mesoAmount: z.number().int().optional()
});

// ==========================================
// SANITIZATION FUNCTIONS
// ==========================================

// Prevent XSS by escaping HTML
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitize for SQL (though we should use parameterized queries)
export function sanitizeForSQL(input: string): string {
  // This is a backup - ALWAYS use parameterized queries!
  return input.replace(/['";\\]/g, '');
}

// NEW: Sanitize security answer for consistent comparison
export function sanitizeSecretAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/\s+/g, ' ');
}

// NEW: Validate file uploads (for future use)
export function validateFileUpload(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
} = {}): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Max size: ${maxSize / (1024 * 1024)}MB` };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}` };
  }

  return { valid: true };
}

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

import { NextRequest, NextResponse } from 'next/server';

export function validateRequest(schema: z.ZodSchema) {
  return async (handler: Function) => {
    return async (req: NextRequest, ...args: any[]) => {
      try {
        const body = await req.json();
        const validated = schema.parse(body);
        
        // Create new request with validated data
        const newReq = new NextRequest(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(validated),
        });
        
        // Copy cookies
        req.cookies.getAll().forEach(cookie => {
          newReq.cookies.set(cookie.name, cookie.value);
        });
        
        return handler(newReq, ...args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { 
              error: 'Validation failed',
              details: error.issues.map(e => ({
                field: e.path.join('.'),
                message: e.message
              }))
            },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: 'Invalid request data' },
          { status: 400 }
        );
      }
    };
  };
}

// ==========================================
// ENHANCED RATE LIMITING
// ==========================================

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  keyGenerator?: (req: NextRequest) => string;
  message?: string;  // Custom error message
}) {
  return (handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) => {
    return async (req: NextRequest, ...args: any[]) => {
      // Generate key (IP + endpoint by default)
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : `${ip}:${req.nextUrl.pathname}`;
      
      const now = Date.now();
      const record = rateLimitStore.get(key);
      
      // Clean up old entries
      if (record && now > record.resetTime) {
        rateLimitStore.delete(key);
      }
      
      // Check rate limit
      if (record && record.count >= options.max) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        return NextResponse.json(
          { error: options.message || 'Too many requests' },
          { 
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': options.max.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
            }
          }
        );
      }
      
      // Update count
      if (record) {
        record.count++;
      } else {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + options.windowMs
        });
      }
      
      // Add rate limit headers to successful responses
      const response = await handler(req, ...args);
      const currentRecord = rateLimitStore.get(key);
      
      if (currentRecord) {
        response.headers.set('X-RateLimit-Limit', options.max.toString());
        response.headers.set('X-RateLimit-Remaining', Math.max(0, options.max - currentRecord.count).toString());
        response.headers.set('X-RateLimit-Reset', new Date(currentRecord.resetTime).toISOString());
      }
      
      return response;
    };
  };
}

// NEW: Specialized rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.'
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: 'Too many registration attempts. Please try again later.'
});

export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts. Please try again later.'
});

export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 admin actions per minute
  message: 'Too many admin actions. Please slow down.'
});

// NEW: Input length validation helpers
export function validateStringLength(
  input: string, 
  minLength: number = 0, 
  maxLength: number = 1000,
  fieldName: string = 'Field'
): { valid: boolean; error?: string } {
  if (input.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  if (input.length > maxLength) {
    return { valid: false, error: `${fieldName} must be no more than ${maxLength} characters` };
  }
  return { valid: true };
}

// NEW: Validate pagination parameters
export function validatePagination(page: any, limit: any): { page: number; limit: number; error?: string } {
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 10;

  if (parsedPage < 1) {
    return { page: 1, limit: parsedLimit, error: 'Page must be 1 or greater' };
  }
  
  if (parsedLimit < 1 || parsedLimit > 100) {
    return { page: parsedPage, limit: 10, error: 'Limit must be between 1 and 100' };
  }

  return { page: parsedPage, limit: parsedLimit };
}