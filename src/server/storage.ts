import { BlobServiceClient} from "@azure/storage-blob"

import { env } from "@/env";

const createStorageClient = () =>
    BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING)

const globalForStorage = globalThis as unknown as {
    storage: ReturnType<typeof createStorageClient> | undefined;
};

export const storage = globalForStorage.storage ?? createStorageClient();

if (env.NODE_ENV !== "production") globalForStorage.storage = storage;
