/** 
 * ui/refreshRenderModules.js
 *
 * a library of render modules that perform specific visual updates
 * in response to user input
 */

import {
	roadmap,
	getEffectiveSystems
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	MAX_HASE_RANK
} from '../constants.js';

import {
	setStatValue,
	renderMount,
	renderMounts
} from './renderModules.js';

import {
	renderSystemTags,
	refreshTags
} from './tags.js';

import {
	SELECT_TEMPLATE,
	renderSelector,
	getSelectorValue,
	setSelectorValue,
	setSelectorClass,
	setOptionHidden
} from './selectors.js';

import {
	allowIncreaseHASE,
	allowDecreaseHASE,
	countUsedHASEPoints
} from '../rules/hase.js';

import {
	calculateMechStats,
	didStatWorsen
} from '../rules/stats.js';

import {
	hasEligibleSystem,
	getSystemNumUses
} from '../rules/systems.js';

import {
	getWeaponNumUses,
	getEffectiveMounts,
	getEffectiveMountType,
	getMountSlots
} from '../rules/weapons.js';

function refreshInheritedCellState(level, type) {
	const hasOwnValues = type === 'mounts' ?
		roadmap.ll[level].mounts != null :
		roadmap.ll[level].systems?.length > 0;

	document.querySelector(`#row-ll-${level} .${type}-cell`)
		?.classList.toggle('inherited', !hasOwnValues);
}

/**
 * Reassess one existing selector without replacing its DOM.
 *
 * @param {HTMLElement} selector
 * @param {number} level
 * @param {string|null} selectedId
 * @param {Object} template
 * @param {Object} extraContext
 */
export function refreshSelector(
	selector,
	level,
	selectedId,
	template,
	extraContext = {}
) {
	let selectionIsInvalid = false;

	const options = selector.querySelector('.selector-menu')?.children ?? [];
	for (const option of options) {
		const id = option.value;
		if (!id)
			continue;

		const context = {
			...extraContext,
			level,
			id,
			selectedId
		};

		// some selections change their listed name depending on other factors
		if (template.redrawLabels) {
			const label = option.querySelector('span');
			label.textContent = template.getLabel({ level, id, selectedId });
		}

		// drop-down lists are adjusted by hiding invalid options
		const disable = !template.getEligibility?.(context);
		setOptionHidden(option, disable);
		if (disable && id === selectedId)
			selectionIsInvalid = true;
	}

	// update the selector's appearance and listed value
	setSelectorValue(selector, selectedId, template, extraContext);
	setSelectorClass(selector, 'occupied', selectedId);
	setSelectorClass(selector, 'error', selectionIsInvalid);
}

/**
 * Update option visibility within a selector class
 * at all levels starting from the given one
 * 
 * @param {Object} template
 * @param {number} level
 * @param {number} maxLevel
 */
export function refreshSelectors(
	template,
	level,
	maxLevel = roadmap.maxLevel
) {
	for (let i = level; i <= maxLevel; i++) {
		// all selectors of a given type and level belong to the same group
		const selectors = document.getElementById(
			`${template.type}-ll-${i}`)?.querySelectorAll('.custom-select');

		if (!selectors)
			continue;

		// roadmap is source of truth for all selector refreshes
		let roadmapData = template.readLevel(i);
		if (!(roadmapData instanceof Array))
			roadmapData = [roadmapData];
		if (template === SELECT_TEMPLATE.SYSTEM)
			roadmapData = roadmapData.map(item => item?.id ?? null);

		for (let idx = 0; idx < selectors.length; idx++) {
			const selectedId = roadmapData[idx] ?? null;
			refreshSelector(selectors[idx], i, selectedId, template);
		}
	}
}

/**
 * Update option visibility within a weapon selector
 * at all levels starting from the given one
 *
 * @param {number} level
 * @param {number} maxLevel
 */
export function refreshWeaponSelectors(
	level,
	maxLevel = roadmap.maxLevel
) {
	for (let i = level; i <= maxLevel; i++) {
		const mounts = getEffectiveMounts(i);
		const selectors = document.querySelectorAll(
			`#row-ll-${i} .mounts-list .weapon`);

		for (const selector of selectors) {
			const mountIdx = Number(selector.dataset.mountIdx);
			const slotIdx = Number(selector.dataset.slotIdx);
			const mount = mounts[mountIdx];
			const slot = mount ? getMountSlots(mount)[slotIdx] : null;
			if (!mount || !slot)
				continue;

			const selectedId = mount.weapons[slotIdx]?.id ?? null;
			refreshSelector(
				selector,
				i,
				selectedId,
				SELECT_TEMPLATE.WEAPON,
				{ slot }
			);
		}

		refreshTags(i, selectors);
	}
}

/**
 * Selectively update the numerator of the HASE point tooltip
 * 
 * @param {number} level
 */
export function refreshHASETooltip(level) {
	document.getElementById(`hase-ll-${level}`)
		.querySelector('.hase-spent').textContent = countUsedHASEPoints(level);
}

/**
 * Lightweight UI update for stat hexes
 * +/- buttons and number values update
 * 
 * @param {number} level
 * @param {string} id
 */
export function refreshHexes(level, id) {
	const hexGroup = document.getElementById(`hase-ll-${level}`);

	for (const hex of hexGroup.querySelectorAll('.hex')) {
		const hexId = hex.dataset.skillId;

		if (hexId === id) {
			const value = cumulativeCatalog.hase[level].get(id);
			hex.classList.toggle('error', value > MAX_HASE_RANK);
			hex.children[1].textContent = value ?? 0;
		}

		hex.children[0].disabled = !allowIncreaseHASE(level, hexId);
		hex.children[2].disabled = !allowDecreaseHASE(level, hexId);
	}
}

/**
 * Refresh display stats values
 * 
 * @param {number} level
 */
export function refreshStats(level) {
	const stats = calculateMechStats(cumulativeCatalog, level);
	for (const [id, value] of Object.entries(stats)) {
		const statBubble = document.getElementById(`stat-${id}-ll-${level}`);
		if (statBubble) {
			setStatValue(statBubble.parentElement, statBubble, id, value);
			statBubble.classList.toggle('hazard',
				didStatWorsen(cumulativeCatalog, level, id));
		}
	}

	const mounts = document.getElementById(`mounts-list-ll-${level}`);
	refreshTags(level, mounts.querySelectorAll(
		'.custom-select, .custom-select-mimic'));
	const systems = document.getElementById(`system-ll-${level}`);
	refreshTags(level, systems.children);
}

export function redrawMount(level, mountIdx) {
	refreshInheritedCellState(level, 'mounts');
	const mounts = getEffectiveMounts(level);
	const mount = document.getElementById(`mounts-list-ll-${level}`)
		.children[mountIdx];
	mount.replaceWith(
		renderMount(level, mountIdx, mounts[mountIdx]));

	// single-level selector refresh
	refreshWeaponSelectors(level, level);
}

/**
 * Full refresh of mounts cell at a given level
 * Adds mounts that cannot be matched to previous layout
 * Removes mounts not present on new layout
 * Preserves in place all other mounts
 *
 * @param {number} level
 */
export function redrawMounts(level) {
	refreshInheritedCellState(level, 'mounts');
	const container = document.getElementById(`mounts-list-ll-${level}`);
	const mounts = getEffectiveMounts(level);

	for (let idx = 0; idx < mounts.length; idx++) {
		const data = mounts[idx];
		const currentMount = container.children[idx];
		const currentSlots = currentMount
			?.querySelectorAll('.custom-select').length;
		const requiredSlots = getMountSlots(data).length;

		if (!currentMount) {
			// if the current mount list is exhausted, add a new mount
			container.append(renderMount(level, idx, data));
		}
		else if (currentMount.dataset.mountType !== getEffectiveMountType(data) ||
			currentSlots !== requiredSlots ||
			currentMount.dataset.integrated !== data.integrated) {
			// if the current mount doesn't match the new type, replace
			currentMount.replaceWith(renderMount(level, idx, data));
		}
	}

	// remove any excess mounts that are not in use
	while (container.children.length > mounts.length)
		container.lastElementChild.remove();
}

/**
 * Targeted replacement of free and total SP counts
 * 
 * @param {number} level
 */
export function refreshBudgetPill(level) {
	const stats = cumulativeCatalog.stats[level];

	const budgetCount = document.getElementById(`budget-free-ll-${level}`);
	const budgetPill = budgetCount.parentElement;
	budgetCount.textContent = stats.sp_budget;
	document.getElementById(
		`budget-total-ll-${level}`).textContent = stats.sp;
	budgetPill.classList.toggle('error', stats.sp_budget < 0);
	budgetPill.style.display = stats.sp_budget ? 'inline' : 'none';
}

export function refreshElectiveSystemList(level) {
	refreshInheritedCellState(level, 'systems');
	const selectGroup = document.getElementById(`system-ll-${level}`);
	if (!selectGroup)
		return;

	const systems = getEffectiveSystems(level);
	const systemCount = systems.length + Number(hasEligibleSystem(level));

	// remove obsolete selectors
	while (selectGroup.children.length > systemCount)
		selectGroup.lastElementChild.remove();

	while (selectGroup.children.length < systemCount) {
		// generate new selector
		const selector =
			renderSelector(level, null, SELECT_TEMPLATE.SYSTEM);
		selector.append(renderSystemTags(level, null));

		// add empty selector to list
		selectGroup.append(selector);
	}

	// reconcile selectors with the effective system list
	for (let idx = 0; idx < systemCount; idx++) {
		const selectedId = systems[idx]?.id ?? null;
		const selector = selectGroup.children[idx];
		selector.dataset.idx = idx;
		refreshSelector(selector, level, selectedId, SELECT_TEMPLATE.SYSTEM);
	}

	refreshTags(level, Array.from(selectGroup.children));
}