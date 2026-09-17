const modalLayer = document.getElementById('modal-layer');
const modalDialog = document.getElementById('modal-dialog');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

const modalContent = {
	tutorial: () => import('./tutorial.js'),
	lcps: () => import('./lcps.js'),
	contact: () => import('./contact.js'),
	license: () => import('./license.js')
};

function closeModal() {
	modalLayer.hidden = true;
}

export async function openModal(button) {
	const loadContent = modalContent[button.dataset.id];
	if (!loadContent)
		return;

	modalTitle.textContent = button.textContent.trim();
	modalBody.innerHTML = '<p>Loading…</p>';
	modalLayer.hidden = false;

	try {
		const { render } = await loadContent();
		modalBody.replaceChildren(render({ close: closeModal }));
	}
	catch (error) {
		console.error('Unable to open modal.', error);
		modalBody.textContent = 'This panel could not be loaded.';
	}
}

export function configureModal() {
	modalLayer.addEventListener('click', event => {
		if (event.target === modalLayer)
			closeModal();
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeModal();
		}
	});
}