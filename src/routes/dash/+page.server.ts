import {  getStatistics } from '$lib/db';

export const csr = false;

export async function load() {
  return getStatistics();
}
