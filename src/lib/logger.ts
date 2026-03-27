type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, scope: string, ...args: unknown[]) {
	console[level](`[${scope}]`, ...args);
}

export function createLogger(scope: string) {
  let silence = true;
	return {
		debug: (...args: unknown[]) => silence && log('debug', scope, ...args),
		info: (...args: unknown[]) =>  silence && log('info', scope, ...args),
		warn: (...args: unknown[]) =>  silence && log('warn', scope, ...args),
		error: (...args: unknown[]) =>  silence && log('error', scope, ...args)
	};
}
