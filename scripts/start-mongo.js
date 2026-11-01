// Developer convenience: run a local mongod with data in ./.data/db on port 27017 (Ctrl+C stops it).
import path from 'node:path';
import { startMongod } from './mongod.js';

const dbPath = path.resolve('.data/db');
const mongo = await startMongod({ dbPath, port: Number(process.env.MONGO_PORT || 27017) });
console.log(`MongoDB running at ${mongo.url} (data: ${dbPath}). Press Ctrl+C to stop.`);
const stop = async () => {
  await mongo.stop({ keepData: true });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
