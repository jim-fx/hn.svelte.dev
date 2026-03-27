type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, scope: string, ...args: unknown[]) {
	console[level](`[${scope}]`, ...args);
}

export function createLogger(scope: string) {
  let enabled = true;
	return {
		debug: (...args: unknown[]) => enabled && log('debug', scope, ...args),
		info: (...args: unknown[]) =>  enabled && log('info', scope, ...args),
		warn: (...args: unknown[]) =>  enabled && log('warn', scope, ...args),
		error: (...args: unknown[]) =>  enabled && log('error', scope, ...args)
	};
}
