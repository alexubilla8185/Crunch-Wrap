import { z } from 'zod';

export const AIResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'failed']),
  summary: z.string().optional(),
  metrics: z.record(z.string(), z.number()).optional(),
  timestamp: z.string().datetime(),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

export const InsightSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  raw_content: z.any(), // Accepts string, Blob, File, etc.
  processing_status: z.enum(['local', 'uploading', 'analyzing', 'completed', 'failed']),
  intelligence: z.object({
    summary: z.string(),
    highlights: z.array(z.string()),
    action_items: z.array(z.string()),
    topics: z.array(z.string()),
    sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'COMPLEX']),
    reading_time: z.string(),
  }).optional(),
  retry_count: z.number().optional(),
  next_retry_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Insight = z.infer<typeof InsightSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const AudioSchema = z.object({
  file: z.instanceof(File).or(z.instanceof(Blob)),
  size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  type: z.enum(['audio/mpeg', 'audio/webm'], {
    message: 'Only audio/mpeg or audio/webm are allowed',
  }),
});
