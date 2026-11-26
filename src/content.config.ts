import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// One YAML file holding a list of records, each with a unique `id`.
// This schema is the only schema: bad data fails the build and names the entry.
const records = defineCollection({
  loader: file('src/data/records.yml'),
  schema: z.object({
    name: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    // The as-of date. Accepts an unquoted YAML date or a quoted "YYYY-MM-DD" string.
    updated: z.coerce.date(),
    // Where the fact comes from. Links from data must be https.
    source: z.string().regex(/^https:\/\//, 'source must start with https://').optional(),
  }),
});

export const collections = { records };
