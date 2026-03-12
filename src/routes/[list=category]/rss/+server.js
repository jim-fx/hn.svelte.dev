import { fetchList } from '$lib/hn';

/**
 * @param {string} list
 * @param {Record<string, any>[]} items
 */
const render = (list, items) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
	<title>Svelte HN (${list})</title>
	<link>https://hn.svelte.dev/${list}/1</link>
	<description>Links from the orange site</description>
	<image>
		<url>https://hn.svelte.dev/favicon.png</url>
		<title>Svelte HN (${list})</title>
		<link>https://hn.svelte.dev/${list}/1</link>
	</image>
	${items
		.map(
			(item) => `
				<item>
					<title>${item.title}${item.domain ? ` (${item.domain})` : ''}</title>
					<link>https://hn.svelte.dev/item/${item.id}</link>
					<description><![CDATA[${
						item.url ? `<a href="${item.url}">link</a> / ` : ''
					}<a href="https://hn.svelte.dev/item/${item.id}">comments</a>
					]]></description>
					<pubDate>${new Date(item.time * 1000).toUTCString()}</pubDate>
				</item>
			`
		)
		.join('\n')}
</channel>
</rss>`;

/**
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ params }) {
	const { items } = await fetchList(params.list, 1);
	const feed = render(params.list, items);

	return new Response(feed, {
		headers: {
			'Cache-Control': `max-age=0, s-max-age=${600}`,
			'Content-Type': 'application/rss+xml'
		}
	});
}
