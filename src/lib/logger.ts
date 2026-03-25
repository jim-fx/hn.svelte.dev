type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, scope: string, ...args: unknown[]) {
	console[level](`[${scope}]`, ...args);
}

export function createLogger(scope: string) {
	return {
		debug: (...args: unknown[]) => log('debug', scope, ...args),
		info: (...args: unknown[]) => log('info', scope, ...args),
		warn: (...args: unknown[]) => log('warn', scope, ...args),
		error: (...args: unknown[]) => log('error', scope, ...args)
	};
}
