import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startMongod } from '../../../scripts/mongod.js';

export const URL_FILE = path.join(os.tmpdir(), 'wb-jest-mongo-url.txt');

export default async function globalSetup() {
  if (process.env.TEST_MONGO_URL) {
    fs.writeFileSync(URL_FILE, process.env.TEST_MONGO_URL);
    return;
  }
  const mongo = await startMongod();
  globalThis.__WB_MONGO__ = mongo;
  fs.writeFileSync(URL_FILE, mongo.url);
  process.env.TEST_MONGO_URL = mongo.url;
}
