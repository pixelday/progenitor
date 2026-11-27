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
    // The as-of date: an unquoted YAML date, or a quoted "YYYY-MM-DD" string. Written as a
    // union so the schema the build writes for editors accepts a plain date: z.coerce.date()
    // comes out as date-time, which flags every 2026-10-02 as an error.
    updated: z.union([z.date(), z.iso.date().transform((value) => new Date(value))], {
      error: 'updated must be a date written as YYYY-MM-DD, quoted or not',
    }),
    // Where the fact comes from. Links from data must be https.
    source: z.string().regex(/^https:\/\//, 'source must start with https://').optional(),
  }),
});

export const collections = { records };
