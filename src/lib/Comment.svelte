<script lang="ts">
	import type { ItemWithComments } from '$lib/hn';
	import { formatDuration } from '$lib/format';
	import CommentEl from './Comment.svelte';
	const { comment } = $props<{ comment: ItemWithComments }>();
	const timeAgo = $derived(
		comment.time ? formatDuration(Math.floor(Date.now() / 1000 - comment.time), 1) + ' ago' : ''
	);
</script>

{#if !comment.deleted}
	<article class="comment" id="comment-{comment.id}">
		<details open>
			<summary>
				<div class="meta-bar" role="button" tabindex="0">
					<span class="meta">
						<a href="/user/{comment.by}">{comment.by}</a>
						{timeAgo}
					</span>
				</div>
			</summary>

			<div class="body">
				{@html comment.text}
			</div>

			{#if comment?.comments?.length}
				<ul class="children">
					{#each comment.comments as child}
						<li><CommentEl comment={child} /></li>
					{/each}
				</ul>
			{/if}
		</details>
	</article>
{/if}

<style>
	.comment {
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}

	:global(html.dark) .comment {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.meta-bar {
		padding: 1em 0;
		cursor: pointer;
		background: 100% 50% no-repeat url(/icons/unfold.svg);
		background-size: 1em 1em;
	}

	.comment details[open] > summary > .meta-bar {
		background-image: url(/icons/fold.svg);
	}

	.comment details > summary {
		list-style-type: none;
	}

	.comment details > summary::marker,
	.comment details > summary::-webkit-details-marker {
		display: none;
	}

	.comment .children {
		padding: 0 0 0 1em;
		margin: 0;
	}

	@media (min-width: 720px) {
		.comment .children {
			padding: 0 0 0 2em;
		}
	}

	li {
		list-style: none;
	}

	.meta {
		display: block;
		font-size: 14px;
		color: var(--fg-light);
	}

	a {
		color: var(--fg-light);
	}

	.body {
		padding-bottom: 15px;
	}

	/* prevent crazy overflow layout bug on mobile */
	.body :global(*) {
		overflow-wrap: break-word;
	}

	.comment :global(pre) {
		overflow-x: auto;
	}
</style>
