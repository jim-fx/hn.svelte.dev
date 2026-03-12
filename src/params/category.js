const categories = new Set(['top', 'new', 'best', 'show', 'ask', 'jobs']);

/** @type {import('@sveltejs/kit').ParamMatcher} */
export const match = (name) => categories.has(name);
