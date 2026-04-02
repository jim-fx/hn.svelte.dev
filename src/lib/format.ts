export function formatNumber(n: number) {
	return n?.toLocaleString() ?? '';
}

export function formatTime(n: number) {
	const d = new Date(n);
	return d.getHours() + ':' + d.getMinutes();
}

export function formatAge(ms: number | null) {
	if (!ms) return 'N/A';
	const hours = Math.floor((Date.now() - ms) / 3600000);
	if (hours < 1) return 'Just now';
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

export function formatDuration(seconds: number): string {
	if (seconds < 60) return `${Math.floor(seconds)}s`;
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
	const hours = Math.floor(mins / 60);
	const minsRem = mins % 60;
	if (hours < 24) return minsRem > 0 ? `${hours}h ${minsRem}m` : `${hours}h`;
	const days = Math.floor(hours / 24);
	const hoursRem = hours % 24;
	return hoursRem > 0 ? `${days}d ${hoursRem}h` : `${days}d`;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
