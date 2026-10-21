'use strict';

const { z } = require('zod');

const resourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  type: z.enum(['guide', 'external']),
  level: z.enum(['beginner', 'intermediate']),
  tags: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).optional(),
  source: z.object({
    name: z.string().min(1),
    url: z.string().url().nullable(),
  }),
});
const catalogueSchema = z.array(resourceSchema).min(1);

/**
 * Serves the learning catalogue with an in-memory TTL cache.
 * Primary repository = Azure Blob Storage (in the cloud); the fallback keeps the app
 * usable, flagged as "degraded", if the blob cannot be read.
 */
function createContentService({ primaryRepository, fallbackRepository, ttlMs, logger }) {
  let cache = null;
  let inflight = null;

  async function readFrom(repository, degraded) {
    const resources = catalogueSchema.parse(await repository.fetchAll());
    cache = { resources, loadedAt: Date.now(), source: repository.name, degraded };
    return cache;
  }

  async function load() {
    try {
      return await readFrom(primaryRepository, false);
    } catch (error) {
      logger.warn('Primary content source failed', { source: primaryRepository.name, error: error.message });
      if (!fallbackRepository) throw error;
      return readFrom(fallbackRepository, true);
    }
  }

  async function ensureFresh() {
    const isStale = !cache || Date.now() - cache.loadedAt > ttlMs;
    if (!isStale) return cache;
    // Share one in-flight load between concurrent requests.
    inflight = inflight || load().finally(() => { inflight = null; });
    return inflight;
  }

  const toSummary = (resource) => ({
    id: resource.id,
    title: resource.title,
    type: resource.type,
    summary: resource.summary,
    url: resource.source.url,
  });

  return {
    async list({ tag } = {}) {
      const { resources, source, degraded } = await ensureFresh();
      const filtered = tag ? resources.filter((resource) => resource.tags.includes(tag)) : resources;
      return { source, degraded, resources: filtered };
    },

    /**
     * Ranks resources against an ordered list of tags: earlier tags weigh more, so the
     * primary topic of a recommendation wins over incidental matches.
     * `exclude` lets the caller avoid repeating resources it already showed.
     */
    async findByTags(tags, limit, { exclude = new Set() } = {}) {
      const { resources } = await ensureFresh();
      const weight = (tag) => {
        const index = tags.indexOf(tag);
        return index === -1 ? 0 : tags.length - index;
      };
      return resources
        .filter((resource) => !exclude.has(resource.id))
        .map((resource) => ({ resource, score: resource.tags.reduce((total, tag) => total + weight(tag), 0) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title))
        .slice(0, limit)
        .map(({ resource }) => toSummary(resource));
    },

    async refresh() {
      cache = null;
      const { resources, source, degraded } = await ensureFresh();
      return { source, degraded, count: resources.length };
    },

    status() {
      return cache
        ? { source: cache.source, degraded: cache.degraded, loadedAt: new Date(cache.loadedAt).toISOString() }
        : { source: null, degraded: false, loadedAt: null };
    },
  };
}

module.exports = { createContentService };
