/**
 * ui/renderModules.js
 * 
 * assorted rendering rules for non-selector UI elements common to level rows
 */

import {
	srcData,
	removeLCP
} from '../data/loader.js';

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	STAT_DEFINITIONS,
	DISPLAYED_MECH_STAT_IDS,
	MAX_HASE_RANK,
	HASE_MAP
} from '../constants.js';

import {
	SELECT_TEMPLATE,
	renderSelector,
	renderWeaponSelector,
} from './selectors.js';

import {
	applyAttachmentManager,
	renderMountTags,
	renderWeaponTags,
	renderSystemTags
} from './tags.js';

import {
	updateHASEWaterfall
} from './updates.js';

import {
	allowIncreaseHASE,
	allowDecreaseHASE,
	countUsedHASEPoints
} from '../rules/hase.js';

import {
	didStatWorsen
} from '../rules/stats.js';

import {
	getEligibleAttachments
} from '../rules/attachments.js';

import {
	getMountSlots,
	getEffectiveMountType,
	getEffectiveMounts
} from '../rules/weapons.js';

import {
	getIntegratedSystemIds
} from '../rules/systems.js';

import sizeHalfSvg from '../assets/size-icons/size-half.svg?raw';
import sizeOneSvg from '../assets/size-icons/size-1.svg?raw';
import sizeTwoSvg from '../assets/size-icons/size-2.svg?raw';
import sizeThreeSvg from '../assets/size-icons/size-3.svg?raw';

const SIZE_ICON_SVGS = Object.freeze({
	0.5: sizeHalfSvg,
	1: sizeOneSvg,
	2: sizeTwoSvg,
	3: sizeThreeSvg
});

export const headerButtons = document.getElementById('header-buttons');

export const roadmapName = document.getElementById('roadmap-name');
export const maxLevelInput = document.getElementById('roadmap-max-level');
export const themeToggle = document.getElementById('theme-toggle');
export const exoticsToggle = document.getElementById('exotics-toggle');
export const loadBtn = document.getElementById('load-btn');
export const saveBtn = document.getElementById('save-btn');
export const roadmapFileInput = document.getElementById('roadmap-file');

export const lcpManager = document.getElementById('lcp-manager');
export const fileInput = document.getElementById('lcp-file');
const lcpPackages = document.getElementById('lcp-packages');
const lcpCount = document.getElementById('lcp-count');
export const lcpStatus = document.getElementById('lcp-status');

export const levelRail = document.querySelector(".level-rail");
export const roadmapShell = document.getElementById("roadmap-shell");
export const roadmapContainer = document.querySelector(".roadmap-container");
export const tableBody = document.getElementById("roadmap-body");
const tableHead = document.querySelector("#roadmap-table thead");

export const modalLayer = document.getElementById('modal-layer');
export const modalDialog = document.getElementById('modal-dialog');

export function renderPackageList(packages, isImport, eventLCP) {
	lcpPackages.replaceChildren();
	lcpCount.textContent = String(packages.length);

	if (eventLCP) {
		lcpStatus.textContent = isImport ?
			`Installed ${eventLCP.name}.` :
			`Removed ${eventLCP.name}.`;
	}

	for (const lcp of packages) {
		const entry = document.createElement('li');
		entry.dataset.packageId = lcp.id;

		const label = document.createElement('span');
		label.textContent = lcp.version ?
			`${lcp.name} ${lcp.version}` : lcp.name;
		label.title = [lcp.author, lcp.description].filter(Boolean).join('\n\n');

		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'clear';
		remove.title = `Remove ${lcp.name} from available data`
		remove.addEventListener('click', () => removeLCP(lcp));

		entry.append(label, remove);
		lcpPackages.append(entry);
	}
}

/**
 * 
 * 
 * @param {{
 *	symbol: string,
 *	className: string,
 *	tooltip: string,
 *	action: function,
 *	disabled: boolean
 * }} param0
 * @returns {HTMLButtonElement}
 */
function renderHASEButton({
	symbol,
	className,
	action,
	tooltip,
	disabled = false
}) {
	const button = document.createElement('button');
	button.className = `hase-button ${className}`;
	button.textContent = symbol;
	button.title = tooltip;
	button.disabled = disabled;

	button.addEventListener('click', action);
	return button;
}

/**
 * Draw a HASE hexagon with +/- knobs and number display
 * 
 * @param {number} level 
 * @returns {HTMLDivElement}
 */
export function renderHexStat(level, id) {
	const value = cumulativeCatalog.hase[level].get(id) ?? 0;

	// container for label and hex
	const haseOption = document.createElement('div');
	haseOption.className = 'hase-option';

	const haseLabel = document.createElement('span');
	haseLabel.className = 'hase-label';
	haseLabel.textContent = HASE_MAP[id].label;

	// surrounding hex layout
	const hexBorder = document.createElement('div');
	hexBorder.className = 'hex-border';

	const hex = document.createElement('div');
	hex.className = 'hex';
	hex.classList.toggle('error', value > MAX_HASE_RANK);
	hex.dataset.skillId = id;

	// user increment/decrement controls
	const increase = renderHASEButton({
		symbol: '+',
		className: 'increase',
		tooltip: `Add ${id} at LL${level}`,
		action: () => updateHASEWaterfall(level, id, true),
		disabled: !allowIncreaseHASE(level, id)
	});

	const decrease = renderHASEButton({
		symbol: '\u2212',
		className: 'decrease',
		tooltip: `Remove ${id} point assigned at LL${level}`,
		action: () => updateHASEWaterfall(level, id, false),
		disabled: !allowDecreaseHASE(level, id)
	});

	// display stat
	const stat = document.createElement('div');
	stat.className = 'hase-value';
	stat.textContent = value ?? '0';

	hex.append(increase, stat, decrease);
	hexBorder.append(hex);
	haseOption.append(haseLabel, hexBorder);

	return haseOption;
}

export function renderHASETooltip(level) {
	const countPoints = level === 0 ? 2 : 1;
	const usedPoints = countUsedHASEPoints(level);

	const tooltip = document.createElement('div');
	tooltip.className = 'hase-tooltip';
	tooltip.innerHTML =
		`<span class='hase-spent'>${usedPoints}</span>/${countPoints} ASSIGNED`;

	return tooltip;
}

/**
 * Get URL to a given frame's art
 * 
 * @param {string} frameId 
 * @returns {string}
 */
export function getFrameImageSrc(frameId) {
	// return srcData.frames.get(frameId)?.image_url;
	return null;
}

/**
 * Size stats represented by a hex-themed SVG
 * All others by their own values
 *
 * @param {HTMLElement} output
 * @param {string} statId
 * @param {number|null} value
 */
export function setStatValue(bubble, output, statId, value) {
	output.value = value;

	if (statId === 'size') {
		const template = document.createElement('template');
		//template.innerHTML = SIZE_ICON_SVGS[value].trim();

		if (template.content.firstElementChild) {
			bubble.classList.add('size-stat-bubble');

			const icon = template.content.firstElementChild;
			icon.classList.add('size-stat-icon');

			const previousIcon = bubble.querySelector('.size-stat-icon');
			if (previousIcon)
				previousIcon.replaceWith(icon);
			else
				bubble.append(icon);
		}
		
		output.textContent = value === 0.5 ? ' ½' : ` ${value}`;
	}
	else {
		output.textContent = ` ${value}`;
	}
}

/**
 * Draw a label-value bubble for a given stat
 * 
 * @param {number} level 
 * @param {string} statId 
 * @param {number} value 
 * @returns {HTMLDivElement}
 */
function renderStatBubble(level, statId) {
	const statValue = cumulativeCatalog.stats[level]?.[statId];

	const statBubble = document.createElement('div');
	statBubble.className = 'stat-bubble';

	// label-value pair
	const label = document.createElement('span');
	label.className = 'stat-label';
	label.textContent = STAT_DEFINITIONS[statId].label ?? statId;

	const output = document.createElement('span');
	output.id = `stat-${statId}-ll-${level}`;
	output.className = 'stat-value';
	setStatValue(statBubble, output, statId, statValue);
	// mark for user attention any stats that have gotten worse this level
	// typically, the result of changing active frames
	output.classList.toggle('hazard',
		didStatWorsen(cumulativeCatalog, level, statId));

	statBubble.append(label, output);
	return statBubble;
}

/**
 * Draw stats sub-table
 * 
 * @param {number} level
 * @returns {Array<HTMLDivElement>}
 */
export function renderStats(level) {
	return DISPLAYED_MECH_STAT_IDS.map(statId =>
		renderStatBubble(level, statId)
	);
}

/**
 * Create a stand-in element that resembles
 * but does not function as a weapons selector
 * 
 * @param {string} id
 * @returns {HTMLDivElement}
 */
function renderIntegratedWeaponLabel(id) {
	const label = document.createElement('div');
	label.className = 'custom-select-mimic';
	label.textContent = SELECT_TEMPLATE.WEAPON.getLabel({ id });
	label.title = SELECT_TEMPLATE.WEAPON.getDescription({ id });
	return label;
}

/**
 * Draw a mount box and all contents requested in the input data object
 * Wire the mount to listen for any interactions with its weapon selectors
 * 
 * @param {number} level
 * @param {number} idx
 * @param {Object} data
 * @returns {HTMLDivElement}
 */
export function renderMount(level, idx, data) {
	const mountType = getEffectiveMountType(data);
	const mount = document.createElement('div');
	mount.className = 'mount menu';
	mount.dataset.mountType = mountType;
	mount.dataset.mountIdx = idx;

	const label = document.createElement('div');
	label.className = 'menu-label';
	label.textContent = mountType;
	mount.append(label);

	const weapons = data.weapons;
	const slotDefinitions = getMountSlots(data);

	if (!data.integrated) {
		// add mount attachments
		const attachments = getEligibleAttachments(level)
			.filter(attachment => data.attachments?.includes(attachment.id));
		mount.append(renderMountTags(level, attachments, mount));
		applyAttachmentManager(level, mount);
	}

	const slots = document.createElement('div');
	slots.id = `mount-${idx}-ll-${level}`;
	slots.className = 'select-group';
	// add all weapons to the mount
	for (let i = 0; i < slotDefinitions.length; i++) {
		if (data.integrated) {
			// integrated mount w/ pseudo-selector
			mount.classList.add('integrated');
			mount.dataset.integrated = data.integrated;
			const selector = renderIntegratedWeaponLabel(weapons[i]?.id);
			selector.dataset.mountIdx = idx;
			selector.dataset.slotIdx = i;
			selector.append(renderWeaponTags(level, weapons[i], idx, i));
			slots.append(selector);
		}
		else {
			// true selection mount
			slots.append(renderWeaponSelector(
				level, idx, i, slotDefinitions[i], weapons[i]));
		}
	}

	mount.append(slots);

	return mount;
}

/**
 * Get a list of render-ready elements representing all mounts at this level
 * 
 * @param {number} level
 * @returns {Array<HTMLDivElement>}
 */
export function renderMounts(level) {
	const mountsList = document.createElement('div');
	mountsList.id = `mounts-list-ll-${level}`;
	mountsList.className = 'mounts-list';

	mountsList.append(...getEffectiveMounts(level).map((mount, index) =>
		renderMount(level, index, mount)
	));

	return mountsList;
}

export function renderIntegratedSystems(level) {
	const integratedSystems = document.createElement('div');
	integratedSystems.className = 'systems-integrated';
	integratedSystems.hidden = true;

	// get integrated systems from frame, if any
	const systemIds = getIntegratedSystemIds(level);

	for (const systemId of systemIds) {
		const system = srcData.systems.get(systemId);
		if (system) {
			integratedSystems.hidden = false;
			const listing = document.createElement('span');

			const systemLabel = document.createElement('span');
			systemLabel.textContent = system.name ?? '';
			systemLabel.title =	SELECT_TEMPLATE.SYSTEM
				.getDescription({ id: systemId }) ?? '';

			listing.append(systemLabel, renderSystemTags(level, systemId));
			integratedSystems.append(listing);
		}
	}

	return integratedSystems;
}

/**
 * Draw fractional SP budget for the systems column
 * 
 * @param {number} level
 * @returns {HTMLDivElement}
 */
export function renderBudgetPill(level) {
	const stats = cumulativeCatalog.stats[level];

	const budgetPill = document.createElement('div');
	budgetPill.className = 'budget-pill';

	const budgetFree = document.createElement('span');
	budgetFree.id = `budget-free-ll-${level}`;
	budgetFree.textContent = stats.sp_budget;

	const budgetTotal = document.createElement('span');
	budgetTotal.id = `budget-total-ll-${level}`;
	budgetTotal.textContent = stats.sp;

	budgetPill.append(budgetFree, '/', budgetTotal, ' SP');
	budgetPill.classList.toggle('error', stats.sp_budget < 0);
	budgetPill.style.display = stats.sp_budget ? 'inline' : 'none';

	return budgetPill;
}