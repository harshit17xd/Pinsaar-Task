const { z } = require('zod');

const createNoteSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  body: z.string().min(1).max(1000).trim(),
  releaseAt: z.string().datetime().transform((val) => new Date(val)),
  webhookUrl: z.string().url().trim()
});

const listNotesSchema = z.object({
  status: z.enum(['pending', 'delivered', 'failed', 'dead']).optional(),
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default('1')
});

module.exports = {
  createNoteSchema,
  listNotesSchema
};
