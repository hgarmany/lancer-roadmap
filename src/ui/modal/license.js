const REPOSITORY_URL = 'https://github.com/hgarmany/lancer-roadmap';

export function render() {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = `
		<p>Lancer Roadmap is not an official Lancer product; it is a third party work, and is not affiliated with Massif Press. Lancer Roadmap is published via the Lancer Third Party License.</p>
		<p>Lancer is copyright Massif Press.</p>
		<p>The application is licensed under the GNU General Public License, version 3 or later. Any Massif Press or third-party assets accessed or reproduced herein retain their own terms and are not covered under the GPL.</p>
		<div class="modal-actions">
			<a href="${REPOSITORY_URL}/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">Read GPL license</a>
			<a href="${REPOSITORY_URL}/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener noreferrer">Third-party notices</a>
			<a href="https://massifpress.com/legal" target="_blank" rel="noopener noreferrer">Lancer Third Party License</a>
		</div>
	`;
	return content;
}