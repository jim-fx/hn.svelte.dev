import { resolve } from 'node:path';
import { DB_DIR } from '$env/static/private';
import { existsSync } from 'fs';
import { mkdirSync } from 'node:fs';

function existsSafe(){
  try {
    return existsSync(ZSTD_PATH) || existsSync(ZSTD_PATH+".so")
  }catch {
    //
  }
  return false;
}

const ZSTD_PATH = resolve(DB_DIR, 'zstd_vfs.so');
const IS_COMPRESSED = existsSafe();
const DATA_DIR = DB_DIR ?? resolve('./data');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
export { DATA_DIR, IS_COMPRESSED, ZSTD_PATH };
