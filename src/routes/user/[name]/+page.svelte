<script>
	const { data: user } = $props();
</script>

<svelte:head>
	<title>{user.id} • Svelte Hacker News</title>
</svelte:head>

<h1>{user.id}</h1>

<div>
	<p>
		...joined <strong>{user.created_ago}</strong>, and has <strong>{user.karma}</strong> karma
	</p>

	<p>
		<a href="https://news.ycombinator.com/submitted?id={user.id}">submissions</a> /
		<a href="https://news.ycombinator.com/threads?id={user.id}">comments</a> /
		<a href="https://news.ycombinator.com/favorites?id={user.id}">favourites</a>
	</p>

	{#if user.about}
		<div class="about">
			{@html '<p>' + user.about}
		</div>
	{/if}
</div>
