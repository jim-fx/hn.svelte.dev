import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export const csr = false;

export function load() {
	throw redirect(dev ? 302 : 301, '/top/1');
}
