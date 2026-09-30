/**
 * ui/updates.js
 * 
 * a library of update coordinators for various user inputs
 * drives back-end data writes and front end refreshes
 */

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	getFrameImageSrc
} from './renderModules.js';

import {
	setSelectorClass,
	SELECT_TEMPLATE
} from './selectors/selectors.js';

import {
	renderAttachmentsMenu,
	refreshTags
} from './tags.js';

import {
	refreshSelectors,
	refreshHexes,
	refreshHASETooltip,
	refreshStats,
	refreshBudgetPill,
	refreshIntegratedSystems,
	refreshElectiveSystemList,
	refreshWeaponSelectors,
	redrawMount,
	redrawMounts
} from './refreshRenderModules.js';

import {
	updateHASELog
} from '../rules/hase.js';

import {
	getEffectiveFrameId
} from '../rules/frames.js';

import {
	didStatWorsen
} from '../rules/stats.js';

import {
	getEffectiveMounts,
	reconfigureMounts,
	resetEmptyMounts
} from '../rules/weapons.js';

import {
	updateAppliedAttachments
} from '../rules/attachments.js';

import {
	STAT_DEFINITIONS
} from '../constants.js';

function refreshAttachmentMenu(level) {
	const current = document.getElementById(`attachments-ll-${level}`);
	if (current)
		current.replaceWith(renderAttachmentsMenu(level));
}

/**
 * Write to the roadmap and cumulative catalog a user selection
 * 
 * @param {Event} event 
 * @param {Object} template 
 */
export function selectionUpdate(selector, template) {
	const currentLevel = Number(selector.dataset.ll);
	const idx = Number(selector.dataset.idx);

	const newId = selector.value;

	// update roadmap and cumulative catalog
	template.write({ level: currentLevel, idx, id: newId });
}

export function skillTriggerUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.SKILL_TRIGGER);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.SKILL_TRIGGER, level);
}

export function talentUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.TALENT);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.TALENT, level);

	// update integrated mounts and systems
	for (let i = level; i <= roadmap.maxLevel; i++) {
		// resolves existing hard-set integrated talent mounts
		reconfigureMounts(i);
		redrawMounts(i);
		refreshAttachmentMenu(i);
		refreshIntegratedSystems(i);
		refreshElectiveSystemList(i);
	}

	refreshWeaponSelectors(level);
}

export function licenseUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.LICENSE);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.LICENSE, level);
	refreshSelectors(SELECT_TEMPLATE.CORE_BONUS, level);
	refreshSelectors(SELECT_TEMPLATE.FRAME, level);
	refreshWeaponSelectors(level);
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function coreBonusUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.CORE_BONUS);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.CORE_BONUS, level);

	// update stats and mount cells
	for (let i = level; i <= roadmap.maxLevel; i++) {
		if (i === level || roadmap.ll[i].mounts)
			reconfigureMounts(i);
		updateAppliedAttachments(i);
		mountTagUpdate(i, [...getEffectiveMounts(i).keys()]);
		weaponTagUpdate(i, [...getEffectiveMounts(i).keys()]);
		refreshStats(i);
		redrawMounts(i);
		refreshAttachmentMenu(i);
	}

	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function updateHASEWaterfall(level, id, doIncrement) {
	// update roadmap and cumulative catalog
	updateHASELog(level, id, doIncrement);
	refreshHASETooltip(level);

	// update each level's hex displays, stat table, and systems menu
	for (let i = level; i <= roadmap.maxLevel; i++) {
		refreshHexes(i, id);
		refreshStats(i);

		refreshBudgetPill(i);
		refreshIntegratedSystems(i);
		refreshElectiveSystemList(i);
	}

	refreshWeaponSelectors(level);
}

/**
 * Frame and frame-dependent data is updated from the given level
 * up to the first later level where a different frame is selected
 * 
 * @param {Event} event 
 * @param {number} level 
 */
export function activeFrameWaterfall(selectValue, level) {
	for (let i = level; i <= roadmap.maxLevel; i++) {
		// clear the current level's frame id if it matches the new id
		// this level becomes an inheritor of the starting level's frame
		if (roadmap.ll[i].frameId === getEffectiveFrameId(i - 1))
			roadmap.ll[i].frameId = null;

		// end whenever the current level already has a specified frame id
		if (i !== level && roadmap.ll[i].frameId)
			break;

		cumulativeCatalog.activeFrame[i] = selectValue;

		// update frame image
		const icon = document.getElementById(
			`${SELECT_TEMPLATE.FRAME.type}-ll-${i}-icon`);
		icon.src = getFrameImageSrc(selectValue) ?? '';
		icon.referrerPolicy = 'no-referrer';

		// update frame selector
		const selector = document.getElementById(
			`${SELECT_TEMPLATE.FRAME.type}-ll-${i}`)
			.querySelector('.custom-select');
		selector.value = selectValue;

		const label = selector.querySelector('.selector-value');
		if (label) {
			label.textContent =
				SELECT_TEMPLATE.FRAME
					.getLabel?.({ level, id: selectValue }) ?? '';
		}

		setSelectorClass(selector, 'inherited', i !== level);

		// add or rewrite mounts on the roadmap to meet frame specifications
		reconfigureMounts(i);
	}
}

export function frameUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.FRAME);

	activeFrameWaterfall(selector.value, level);

	let stopLevel = level;

	// update stats and budget pill in waterfall
	for (
		let i = level;
		i <= roadmap.maxLevel && (i === level || !roadmap.ll[i].frameId);
		i++
	) {
		refreshStats(i);
		redrawMounts(i);
		refreshAttachmentMenu(i);
		refreshBudgetPill(i);
		refreshIntegratedSystems(i);
		refreshElectiveSystemList(i);

		stopLevel++;
	}

	// narrow stat display change - update stat decrease indicators
	if (stopLevel <= roadmap.maxLevel) {
		const stats = cumulativeCatalog.stats[stopLevel];
		for (const stat of Object.values(STAT_DEFINITIONS)) {
			const id = stat.frameProperty;
			const statBubble = document.getElementById(
				`stat-${id}-ll-${stopLevel}`);
			if (statBubble) {
				statBubble.classList.toggle('hazard',
					didStatWorsen(cumulativeCatalog, stopLevel, id));
			}
		}
	}

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.FRAME, level);
}

export function weaponTagUpdate(level, mountIndices) {
	refreshAttachmentMenu(level);
	for (const mountIdx of [...new Set(mountIndices)]) {
		const mount =
			document.getElementById(`mount-${mountIdx}-ll-${level}`);
		if (mount)
			refreshTags(level, mount.querySelectorAll(
				'.weapon, .custom-select-mimic'));
	}
}

export function mountTagUpdate(level, mountIndices) {
	refreshAttachmentMenu(level);
	for (const mountIdx of mountIndices)
		redrawMount(level, mountIdx);
}

export function weaponUpdate(selector, level) {
	const template = SELECT_TEMPLATE.WEAPON;

	// selection update
	const mountIdx = Number(selector.dataset.mountIdx);
	const slotIdx = Number(selector.dataset.slotIdx);
	const newId = selector.value;

	// update roadmap and cumulative catalog
	template.write({
		level,
		mountIdx,
		slotIdx,
		id: newId
	});
	let alteredMountIndices = updateAppliedAttachments(level);
	if (resetEmptyMounts(level))
		alteredMountIndices = [...getEffectiveMounts(level).keys()];

	// This level becomes a loadout boundary. Later levels inherit it until
	// another level explicitly defines its own mounts.
	for (let i = level; i <= roadmap.maxLevel; i++) {
		if (i > level && roadmap.ll[i].mounts)
			break;

		mountTagUpdate(i, alteredMountIndices);
		weaponTagUpdate(i, [mountIdx]);
		refreshStats(i);
		refreshBudgetPill(i);
		redrawMount(i, mountIdx);

		// update all attached selectors at this level
		refreshWeaponSelectors(i, i);
		refreshSelectors(SELECT_TEMPLATE.SYSTEM, i, i);
	}
}

export function systemUpdate(selector, level) {
	/**
	 * systems menus quietly inherit configurations from previous levels
	 * 
	 * when the user manually selects a system in a level that is actually
	 * empty in the roadmap, first copy system configuration into this level
	 */
	selectionUpdate(selector, SELECT_TEMPLATE.SYSTEM);

	// update stats and budget pill
	for (let i = level; i <= roadmap.maxLevel; i++) {
		weaponTagUpdate(i, []);

		refreshStats(i);
		refreshBudgetPill(i);
		refreshElectiveSystemList(i);

		// update all attached selectors at this level
		refreshWeaponSelectors(i, i);
	}
}