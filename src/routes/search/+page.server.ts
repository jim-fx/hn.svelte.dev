import * as hn from '$lib/hn';

export async function load({ url }) {
  const query = url.searchParams.get('q');
  if(!query) return {
    query,
    items: []
  };

  const items = await hn.searchItems(query);

  return {
    query,
    items
  }
}
