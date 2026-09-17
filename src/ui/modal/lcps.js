export function render({ close }) {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = `
		<div class="modal-actions">
			<button type="button" data-action="manage">Manage packages</button>
			<button type="button" data-action="import">Choose an LCP file</button>
		</div>
	`;

	const manager = document.getElementById('lcp-manager');
	content.querySelector('[data-action="manage"]').addEventListener('click', () => {
		close();
		manager.open = true;
		manager.querySelector('summary')?.focus();
	});
	content.querySelector('[data-action="import"]').addEventListener('click', () => {
		close();
		manager.open = true;
		document.getElementById('lcp-file')?.click();
	});

	return content;
}