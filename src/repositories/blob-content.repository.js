'use strict';

/**
 * Reads the content catalogue from Azure Blob Storage using the Web App's
 * managed identity (DefaultAzureCredential): no keys or connection strings.
 * Required role on the storage account: "Storage Blob Data Reader".
 */
function createBlobContentRepository({ accountName, containerName, blobName }) {
  // Loaded lazily so local runs and tests never need the Azure SDKs.
  const { BlobServiceClient } = require('@azure/storage-blob');
  const { DefaultAzureCredential } = require('@azure/identity');

  const serviceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    new DefaultAzureCredential(),
  );

  return {
    name: 'azure-blob',
    async fetchAll() {
      const blobClient = serviceClient.getContainerClient(containerName).getBlobClient(blobName);
      const buffer = await blobClient.downloadToBuffer();
      return JSON.parse(buffer.toString('utf8'));
    },
  };
}

module.exports = { createBlobContentRepository };
