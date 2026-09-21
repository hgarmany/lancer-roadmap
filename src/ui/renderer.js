// ui/renderer.js

import {
	roadmap,
	setMaxLevel,
	saveRoadmapFile,
	loadRoadmapFile
} from '../data/roadmap.js';

import {
	resizeCatalog,
	initializeCatalog
} from '../data/cumulativeCatalog.js';

import {
	renderLevelLabel,
	renderLevelRow
} from './roadmapTable.js';

import {
	refreshSelectors,
	refreshWeaponSelectors,
	refreshElectiveSystemList
} from './refreshRenderModules.js';

import {
	openModal
} from './modal/modal.js';

import {
	SELECT_TEMPLATE
} from './selectors.js';

import {
	THEME
} from '../constants.js';

const headerButtons = document.getElementById('header-buttons');
const appTitle = document.getElementById('title');
const header = headerButtons.closest('header');
const licenseMarks = header.querySelectorAll('.license-mark');

const roadmapName = document.getElementById('roadmap-name');
const maxLevelInput = document.getElementById('roadmap-max-level');
const themeToggle = document.getElementById('theme-toggle');
const exoticsToggle = document.getElementById('exotics-toggle');
const loadBtn = document.getElementById('load-btn');
const saveBtn = document.getElementById('save-btn');
const roadmapFileInput = document.getElementById('roadmap-file');

export const lcpManager = document.getElementById('lcp-manager');
export const fileInput = document.getElementById('lcp-file');
export const lcpStatus = document.getElementById('lcp-status');

const levelRail = document.querySelector(".level-rail");
const roadmapShell = document.getElementById("roadmap-shell");
const roadmapContainer = document.querySelector(".roadmap-container");
const tableBody = document.getElementById("roadmap-body");

function positionLevelLabels() {
	const railTop = levelRail.getBoundingClientRect().top;

	for (const label of levelRail.querySelectorAll('.level-tab')) {
		const row = document.getElementById(`row-ll-${label.dataset.ll}`);
		if (!row)
			continue;

		const rowRect = row.cells[0].getBoundingClientRect();
		label.style.top = `${rowRect.top - railTop}px`;
		label.style.height = `${rowRect.height}px`;
	}
}

const levelRowResizeObserver = new ResizeObserver(positionLevelLabels);

function updateTableOverflowIndicators() {
	const leftOverflow = roadmapContainer.scrollLeft;
	const rightOverflow = roadmapContainer.scrollWidth -
		roadmapContainer.clientWidth - leftOverflow;
	const shellRect = roadmapShell.getBoundingClientRect();
	const bodyRect = tableBody.getBoundingClientRect();

	roadmapShell.style.setProperty(
		'--table-body-top',
		`${bodyRect.top - shellRect.top}px`
	);
	roadmapShell.style.setProperty(
		'--table-body-height',
		`${bodyRect.height}px`
	);

	roadmapShell.classList.toggle('overflow-left', leftOverflow > 0);
	roadmapShell.classList.toggle('overflow-right', rightOverflow > 0);
}

const tableOverflowObserver =
	new ResizeObserver(updateTableOverflowIndicators);

function resizeRoadmapName() {
	roadmapName.style.width = '0';
	roadmapName.style.width = `${roadmapName.scrollWidth}px`;
}

function refreshRoadmapMenu() {
	roadmapName.value = roadmap.name;
	resizeRoadmapName();
	maxLevelInput.value = String(roadmap.maxLevel);
	exoticsToggle.checked = roadmap.allowExotics;
	document.documentElement.dataset.exotics = roadmap.allowExotics;
}

/**
 * Set 
 */
function updateTitleVisibility() {
	const titleRect = appTitle.getBoundingClientRect();
	const buttonsRight = Math.max(
		headerButtons.getBoundingClientRect().right,
		...Array.from(headerButtons.children, button =>
			button.getBoundingClientRect().right)
	);
	const markLeft = Array.from(licenseMarks).find(mark =>
		mark.getClientRects().length)
		?.getBoundingClientRect().left ?? Infinity;

	appTitle.style.visibility =
		titleRect.left >= buttonsRight &&
		titleRect.right <= markLeft ? '' : 'hidden';
}

export function configureHeader() {
	headerButtons?.addEventListener('click', event => {
		const button = event.target.closest?.('button[data-id]');
		if (!button || !event.currentTarget.contains(button))
			return;
		void openModal(button);
	});

	const headerResizeObserver = new ResizeObserver(updateTitleVisibility);
	for (const element of [header, headerButtons, appTitle, ...licenseMarks])
		headerResizeObserver.observe(element);
	updateTitleVisibility();
}

/**
 * Connect the roadmap name and max LL fields to table + roadmap data
 */
export function configureToolMenu() {
	const storedExotics = localStorage.getItem('lancer-roadmap-exotics');
	if (storedExotics !== null)
		roadmap.allowExotics = storedExotics === 'true';
	refreshRoadmapMenu();

	roadmapName.addEventListener('change', event => {
		roadmap.name = event.currentTarget.value;
	});

	themeToggle.checked =
		document.documentElement.dataset.theme === THEME.DARK;

	themeToggle.addEventListener('change', event => {
		const theme = event.currentTarget.checked ? THEME.DARK : THEME.LIGHT;
		document.documentElement.dataset.theme = theme;
		localStorage.setItem('lancer-roadmap-theme', theme);
	});

	exoticsToggle.addEventListener('change', event => {
		roadmap.allowExotics = event.currentTarget.checked;
		document.documentElement.dataset.exotics = roadmap.allowExotics;
		localStorage.setItem('lancer-roadmap-exotics', roadmap.allowExotics);
		refreshSelectors(SELECT_TEMPLATE.CORE_BONUS, 0);
		refreshWeaponSelectors(0);
		for (let level = 0; level <= roadmap.maxLevel; level++)
			refreshElectiveSystemList(level);
	});

	// load/save roadmap file
	loadBtn.addEventListener('click', () => roadmapFileInput.click());
	roadmapFileInput.addEventListener('change', async () => {
		const file = roadmapFileInput.files?.[0];
		if (!file)
			return;

		try {
			await loadRoadmapFile(file);
			initializeCatalog();
			refreshRoadmapMenu();
			rerenderRoadmap();
		}
		catch (error) {
			console.error(error);
		}
		finally {
			roadmapFileInput.value = '';
		}
	});
	saveBtn.addEventListener('click', saveRoadmapFile);

	roadmapName.addEventListener('input', resizeRoadmapName);
	document.fonts?.ready.then(resizeRoadmapName);

	maxLevelInput.addEventListener('change', event => {
		const currentMaxLevel = roadmap.maxLevel;
		const newMaxLevel = Number(event.currentTarget.value);

		if (newMaxLevel === currentMaxLevel)
			return;

		setMaxLevel(roadmap, newMaxLevel);
		resizeCatalog(newMaxLevel);
		
		if (currentMaxLevel > newMaxLevel) {
			// remove every row above the new maximum
			for (let level = currentMaxLevel; level > newMaxLevel; level--) {
				document.getElementById(`row-ll-${level}`).remove();
				document.getElementById(`label-ll-${level}`).remove();
			}
		}
		else {
			// build every new row
			for (let level = currentMaxLevel + 1; level <= newMaxLevel; level++) {
				tableBody.append(renderLevelRow(level));
				levelRail.append(renderLevelLabel(level));
			}
		}

		positionLevelLabels();
	});
}

export function initializeRenderPipeline() {
	tableBody.append(
		...Array.from(
			{ length: roadmap.maxLevel + 1 },
			(_, index) => renderLevelRow(index)
		)
	);
	levelRail.append(
		...Array.from(
			{ length: roadmap.maxLevel + 1 },
			(_, index) => renderLevelLabel(index)
		)
	);

	positionLevelLabels();
	levelRowResizeObserver.observe(tableBody);
	roadmapContainer.addEventListener(
		'scroll',
		updateTableOverflowIndicators,
		{ passive: true }
	);
	tableOverflowObserver.observe(roadmapContainer);
	tableOverflowObserver.observe(tableBody);
	updateTableOverflowIndicators();
}

/**
 * Totally rebuild the roadmap table
 */
export function rerenderRoadmap() {
	tableBody.replaceChildren();
	levelRail.replaceChildren();
	initializeRenderPipeline();
}