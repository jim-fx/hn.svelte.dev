<script>
	/** @type {{ section: string }} section */
	const { section } = $props();
</script>

<nav>
  <div>
    <ul>
      <li><a href="/top/1" class:selected={section === 'top'}>top</a></li>
      <li><a href="/new/1" class:selected={section === 'new'}>new</a></li>
      <li><a href="/show/1" class:selected={section === 'show'}>show</a></li>
      <li><a href="/ask/1" class:selected={section === 'ask'}>ask</a></li>

      <li><a href="/search" class:selected={section === 'search'}>search</a></li>

      <li class="dash">
        <a href="/dash" class:selected={section === 'dash'}>dash</a>
      </li>
    </ul>
  </div>
</nav>

<style>
	nav {
		border-bottom: 1px solid #ff6600;
		color: var(--fg-light);
		font-weight: 300;
	}

	nav > div {
    max-width: 56em;
    margin: 0 auto;
	}
  nav > div > ul {
    padding-inline: 2em;
  }

	ul {
		margin: 0;
	}

  ul > *:first-child > a {
    padding-left: 0px;
  }
  ul > *:last-child > a {
    padding-right: 0px;
  }

	ul::after {
		content: '';
		display: block;
		clear: both;
	}

	li {
		display: block;
		float: left;
	}

	.dash {
		float: right;
	}

	.selected {
		position: relative;
		display: inline-block;
		color: var(--fg);
	}

	.selected::after {
		position: absolute;
		content: '';
		width: calc(100% - 1em);
		height: 2px;
		background-color: #ff6600;
		display: block;
		bottom: 0;
	}

	a {
		color: inherit;
		text-decoration: none;
		padding: 1em 0.5em;
		display: block;
		font-weight: 500;
	}

	@media (min-width: 400px) {
		li {
			display: inline-block;
		}
	}
</style>
