const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

export function timeToReadable(unixSeconds: number): string {
	const diff = Date.now() / 1000 - unixSeconds;
	if (diff < MINUTE) return 'just now';
	if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
	if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
	if (diff < MONTH) return `${Math.floor(diff / WEEK)}w ago`;
	if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo ago`;
	return `${Math.floor(diff / YEAR)}y ago`;
}
