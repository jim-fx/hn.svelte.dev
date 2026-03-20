type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[hn]';

function log(level: LogLevel, ...args: unknown[]) {
	console[level](PREFIX, ...args);
}

export const logger = {
	debug: (...args: unknown[]) => log('debug', ...args),
	info: (...args: unknown[]) => log('info', ...args),
	warn: (...args: unknown[]) => log('warn', ...args),
	error: (...args: unknown[]) => log('error', ...args)
};
