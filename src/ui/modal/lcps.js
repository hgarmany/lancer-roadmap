const lcpContent = `
	Lancer Content Packages (LCP) are data packs originally designed for use in
	COMP/CON, and now the de-facto standard for distributing digital copies of
	non-core rules for Lancer character creation. You can import local copies
	of official supplement LCPs or third-party LCPs through the LCP menu in the
	toolbar.
	<div class="modal-actions">
		<button type="button" class="menu-btn" data-action="manage">
			Manage packages
		</button>
	</div>
`;

export function render({ close }) {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = lcpContent;

	const manager = document.getElementById('lcp-manager');
	content.querySelector('[data-action="manage"]').addEventListener('click', () => {
		close();
		manager.open = true;
		manager.querySelector('summary')?.focus();
	});

	return content;
}