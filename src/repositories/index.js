'use strict';

const { createLocalContentRepository } = require('./local-content.repository');
const { createBlobContentRepository } = require('./blob-content.repository');

/**
 * Picks the content source from configuration:
 *  - STORAGE_ACCOUNT_NAME set -> Azure Blob (primary) + local file (fallback)
 *  - otherwise                -> local file only
 */
function createContentRepositories(config) {
  const local = createLocalContentRepository({ filePath: config.content.localPath });
  if (!config.storage.accountName) {
    return { primaryRepository: local, fallbackRepository: null };
  }
  return {
    primaryRepository: createBlobContentRepository(config.storage),
    fallbackRepository: local,
  };
}

module.exports = { createContentRepositories };
