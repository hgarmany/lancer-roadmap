const REPOSITORY_URL = 'https://github.com/hgarmany/lancer-roadmap';

export function render() {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = `
		<div class="modal-actions">
			<a href="${REPOSITORY_URL}/issues/new" target="_blank" rel="noopener noreferrer">Report an issue</a>
			<a href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer">View source</a>
			<button type="button" data-action="copy">Copy repository link</button>
		</div>
	`;

	content.querySelector('[data-action="copy"]').addEventListener('click', async () => {
		await navigator.clipboard.writeText(REPOSITORY_URL);
	});

	return content;
}