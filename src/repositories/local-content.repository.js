'use strict';

const fs = require('node:fs/promises');

function createLocalContentRepository({ filePath }) {
  return {
    name: 'local-file',
    async fetchAll() {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    },
  };
}

module.exports = { createLocalContentRepository };
