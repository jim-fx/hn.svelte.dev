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

export function formatDuration(seconds: number, parts = 2): string {
	const parts_ = [];
	if (seconds < 60) return `${Math.floor(seconds)}s`;
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	if (mins < 60) {
		parts_.push(`${mins}m`);
		if (secs > 0 && parts > 1) parts_.push(`${secs}s`);
	} else {
		const hours = Math.floor(mins / 60);
		const minsRem = mins % 60;
		if (hours < 24) {
			parts_.push(`${hours}h`);
			if (minsRem > 0 && parts > 1) parts_.push(`${minsRem}m`);
		} else {
			const days = Math.floor(hours / 24);
			const hoursRem = hours % 24;
			parts_.push(`${days}d`);
			if (hoursRem > 0 && parts > 1) parts_.push(`${hoursRem}h`);
		}
	}
	return parts_.slice(0, parts).join(' ');
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
