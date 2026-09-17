const REPOSITORY_URL = 'https://github.com/hgarmany/lancer-roadmap';

const contactContent = `
	<p>
		I've made Lancer Roadmap publicly available for community use, but
		it remains a personal passion project. As such, any feature
		improvements or fixes are made in my own free time. I appreciate
		any feedback or recommendations on how to make this tool more
		useful and intuitive for players.
	</p>
	<div class="modal-actions">
		<a href="${REPOSITORY_URL}"
			class="menu-btn" target="_blank" rel="noopener noreferrer">
			View source <i class="fa fa-external-link"></i>
		</a>
		<a href="${REPOSITORY_URL}/issues/new"
			class="menu-btn" target="_blank" rel="noopener noreferrer">
			Report an issue <i class="fa fa-external-link"></i>
		</a>
	</div>`;

export function render() {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = contactContent;
	return content;
}