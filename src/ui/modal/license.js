const REPOSITORY_URL = 'https://github.com/hgarmany/lancer-roadmap';

const licenseContent = `
	<p>
		Lancer Roadmap is not an official Lancer product; it is a third
		party work, and is not affiliated with Massif Press. Lancer Roadmap
		is published via the Lancer Third Party License.
	</p>
	<p>
		Lancer is copyright Massif Press. Thanks to Massif Press for the
		Lancer game system.
	</p>
	<p>
		This software is licensed under the GNU General Public License,
		version 3 or later. Any Massif Press or third-party assets accessed
		or reproduced herein are not part of the software and thus retain
		their own terms and are not covered under the GPL.
	</p>
	<div class="modal-actions">
		<a href="${REPOSITORY_URL}/blob/main/LICENSE"
			class="menu-btn" target="_blank" rel="noopener noreferrer">
			Read GPL license <i class="fa fa-external-link"></i>
		</a>
		<a href="${REPOSITORY_URL}/blob/main/THIRD_PARTY_NOTICES.md"
			class="menu-btn" target="_blank" rel="noopener noreferrer">
			Third-party notices <i class="fa fa-external-link"></i>
		</a>
		<a href="https://massifpress.com/legal"
			class="menu-btn" target="_blank" rel="noopener noreferrer">
			Lancer Third Party License <i class="fa fa-external-link"></i>
		</a>
	</div>`;

export function render() {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = licenseContent;
	return content;
}