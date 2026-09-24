// ui/selectors/selectors.js

import {
	roadmap
} from '../../data/roadmap.js';

import {
	cumulativeCatalog,
	incrementFromLevel,
	decrementFromLevel
} from '../../data/cumulativeCatalog.js';

import {
	srcData
} from '../../data/loader.js';

import {
	MAX_SKILL_RANK,
	MAX_TALENT_RANK,
	MAX_LICENSE_RANK,
	ROMAN_NUMERALS
} from '../../constants.js';

import {
	infoSources,
	hideInfoBubble
} from './infoBubble.js';

import {
	refreshStats,
	refreshBudgetPill
} from '../refreshRenderModules.js';

import {
	applyAttachmentManager,
	renderSystemTags,
	renderWeaponTags
} from '../tags.js';

import {
	skillTriggerUpdate,
	talentUpdate,
	licenseUpdate,
	coreBonusUpdate,
	frameUpdate,
	weaponUpdate,
	systemUpdate
} from '../updates.js';

import gmsLogoUrl from '../../assets/manufacturer-icons/GMS_logo.svg';
import haLogoUrl from '../../assets/manufacturer-icons/HA_logo.svg';
import horusLogoUrl from '../../assets/manufacturer-icons/HORUS_logo.svg';
import ipsnLogoUrl from '../../assets/manufacturer-icons/IPS-N_logo.svg';
import sscLogoUrl from '../../assets/manufacturer-icons/SSC_logo.svg';

import {
	TAGS,
	doesItemHaveTag
} from '../../rules/installsCommon.js';

import {
	getSkillTriggerRank,
	isSkillTriggerEligible
} from '../../rules/skillTriggers.js';

import {
	getTalentRank,
	isTalentEligible
} from '../../rules/talents.js';

import {
	getLicenseRank,
	isLicenseEligible
} from '../../rules/licenses.js';

import {
	isCoreBonusEligible
} from '../../rules/coreBonuses.js';

import {
	getEffectiveFrameId,
	isFrameEligible
} from '../../rules/frames.js';

import {
	moveAttachment
} from '../../rules/attachments.js';

import {
	isWeaponEligible,
	setWeaponSelection,
	deepCopyMounts,
	resetEmptyMounts
} from '../../rules/weapons.js';

import {
	isSystemEligible,
	hasEligibleSystem,
	configureSystems
} from '../../rules/systems.js';

const selectorMenus = new WeakMap();
let activeSelector = null;
const selectorOverlay = document.getElementById('selector-overlay');

const MANUFACTURERS = Object.freeze({
	'GMS': 0,
	'IPS-N': 1,
	'SSC': 2,
	'HORUS': 3,
	'HA': 4
});

const MOUNTS = Object.freeze({
	'Superheavy': 0,
	'Heavy': 1,
	'Main': 2,
	'Auxiliary': 3
});

const MANUFACTURER_LOGOS = new Map([
	['GMS', gmsLogoUrl],
	['HA', haLogoUrl],
	['HORUS', horusLogoUrl],
	['IPS-N', ipsnLogoUrl],
	['SSC', sscLogoUrl]
]);

/**
 * Each type of selector requires several specific configurations
 * Separate read/write/render profiles are written here for each type
 */
export const SELECT_TEMPLATE = Object.freeze({
	SKILL_TRIGGER: {
		type: 'skill-trigger',
		title: 'Skill Trigger',
		allowClear: true,
		redrawLabels: true,
		getSrcItems: () => srcData.skillTriggers,
		readLevel: (level) => roadmap.ll[level].skillTriggerIds,
		write: ({ level, idx, id }) => {
			const oldId = roadmap.ll[level].skillTriggerIds[idx];
			roadmap.ll[level].skillTriggerIds[idx] = id;
			incrementFromLevel(cumulativeCatalog.skillTriggers, id, level);
			decrementFromLevel(cumulativeCatalog.skillTriggers, oldId, level);
		},
		getLabel: ({ level, id, selectedId }) => {
			if (!id)
				return 'Select a skill trigger';

			const rank = getSkillTriggerRank(level, id, selectedId);
			const showRank = rank < MAX_SKILL_RANK;

			return srcData.skillTriggers.get(id)?.name +
				(showRank ? ` ${ROMAN_NUMERALS[rank]}` : '');
		},
		applyDescription: ({ id }) =>
			srcData.skillTriggers.get(id)?.description,
		getEligibility: ({ level, id, selectedId }) =>
			isSkillTriggerEligible(level, id, selectedId),
		changeEvent: (selector, level) => skillTriggerUpdate(selector, level)
	},
	TALENT: {
		type: 'talent',
		title: 'Talent',
		allowClear: true,
		redrawLabels: true,
		getSrcItems: () => [...srcData.talents.entries()]
			.sort((a, b) => a[1].name.toLowerCase() > b[1].name.toLowerCase()),
		readLevel: (level) => roadmap.ll[level].talentIds,
		write: ({ level, idx, id }) => {
			const oldId = roadmap.ll[level].talentIds[idx];
			roadmap.ll[level].talentIds[idx] = id;
			incrementFromLevel(cumulativeCatalog.talents, id, level);
			decrementFromLevel(cumulativeCatalog.talents, oldId, level);
		},
		getLabel: ({ level, id, selectedId }) => {
			if (!id)
				return 'Select a talent';

			const rank = getTalentRank(level, id, selectedId);
			const showRank = rank < MAX_TALENT_RANK;

			return srcData.talents.get(id)?.name +
				(showRank ? ` ${ROMAN_NUMERALS[rank]}` : '');
		},
		applyDescription: renderTalentDescription,
		getEligibility: ({ level, id, selectedId }) =>
			isTalentEligible(level, id, selectedId),
		changeEvent: (selector, level) => talentUpdate(selector, level)
	},
	LICENSE: {
		type: 'license',
		title: 'License',
		allowClear: true,
		redrawLabels: true,
		getSrcItems: () => [...srcData.licenses.entries()]
			.sort((a, b) => {
				if (a[1].source !== b[1].source)
					return MANUFACTURERS[a[1].source] >
						MANUFACTURERS[b[1].source];
				return a[1].name.toLowerCase() > b[1].name.toLowerCase();
			}),
		readLevel: (level) => roadmap.ll[level].licenseId,
		write: ({ level, id }) => {
			const oldId = roadmap.ll[level].licenseId;
			roadmap.ll[level].licenseId = id;
			incrementFromLevel(cumulativeCatalog.licenses, id, level);
			decrementFromLevel(cumulativeCatalog.licenses, oldId, level);
		},
		getLabel: ({ level, id, selectedId }) => {
			if (!id)
				return 'Select a license';

			const rank = level ? getLicenseRank(level, id, selectedId) : 0;
			const showRank = rank < MAX_LICENSE_RANK;

			return srcData.licenses.get(id)?.name +
				(showRank ? ` ${ROMAN_NUMERALS[rank]}` : '');
		},
		applyDescription: renderLicenseDescription,
		getEligibility: ({ level, id, selectedId }) =>
			isLicenseEligible(level, id, selectedId),
		changeEvent: (selector, level) => licenseUpdate(selector, level)
	},
	CORE_BONUS: {
		type: 'core-bonus',
		title: 'Core Bonus',
		allowClear: true,
		getSrcItems: () => [...srcData.coreBonuses.entries()]
			.sort((a, b) => {
				if (a[1].source !== b[1].source)
					return MANUFACTURERS[a[1].source] >
						MANUFACTURERS[b[1].source];
				return a[1].name.toLowerCase() > b[1].name.toLowerCase();
			}),
		readLevel: (level) => roadmap.ll[level].coreBonusId,
		write: ({ level, id }) => {
			const oldId = roadmap.ll[level].coreBonusId;
			roadmap.ll[level].coreBonusId = id;
			incrementFromLevel(cumulativeCatalog.coreBonuses, id, level);
			decrementFromLevel(cumulativeCatalog.coreBonuses, oldId, level);
		},
		getLabel: ({ id }) => {
			return id ? (srcData.coreBonuses.get(id)?.name ?? '') :
				'Select a core bonus';
		},
		applyDescription: ({ id }) => {
			const content = document.createElement('p');
			content.innerHTML = srcData.coreBonuses.get(id)?.effect;
			return content;
		},
		getEligibility: ({ level, id, selectedId }) =>
			isCoreBonusEligible(level, id, selectedId),
		changeEvent: (selector, level) => coreBonusUpdate(selector, level)
	},
	FRAME: {
		type: 'frame',
		getSrcItems: () => [...srcData.frames.entries()]
			.sort((a, b) => {
				if (a[0] === 'mf_standard_pattern_i_everest')
					return -1;
				if (a[1].license_level != b[1].license_level)
					return a[1].license_level < b[1].license_level;
				if (a[1].source !== b[1].source)
					return MANUFACTURERS[a[1].source] >
						MANUFACTURERS[b[1].source];
				return a[1].name.toLowerCase() > b[1].name.toLowerCase();
			}),
		readLevel: (level) => getEffectiveFrameId(level),
		write: ({ level, id }) => {
			roadmap.ll[level].frameId =
				(getEffectiveFrameId(level - 1) !== id) ? id : null;
			cumulativeCatalog.activeFrame[level] = id;

			roadmap.ll[level].mounts = null;
		},
		getLabel: ({ id }) => {
			return id ? srcData.frames.get(id)?.name : null;
		},
		applyDescription: renderFrameDescription,
		getEligibility: ({ level, id }) =>
			isFrameEligible(level, id),
		changeEvent: (selector, level) => frameUpdate(selector, level)
	},
	WEAPON: {
		type: 'weapon',
		allowClear: true,
		redrawLabels: true,
		getSrcItems: () => [...srcData.weapons.entries()].sort(sortEquipment),
		write: ({ level, mountIdx, slotIdx, id }) =>
			setWeaponSelection(level, mountIdx, slotIdx, id),
		getLabel: ({ id, slot = null }) => {
			return id ? (srcData.weapons.get(id)?.name ?? '') :
				slot?.label;
		},
		applyDescription: renderWeaponDescription,
		getEligibility: ({ level, id, selectedId, slot }) =>
			isWeaponEligible(level, id, selectedId, slot),
		changeEvent: (selector, level) => weaponUpdate(selector, level)
	},
	SYSTEM: {
		type: 'system',
		allowClear: true,
		redrawLabels: true,
		getSrcItems: () => [...srcData.systems.entries()].sort(sortEquipment),
		readLevel: (level) => {
			for (let i = level; i >= 0; i--) {
				if (roadmap.ll[i].systems[0])
					return roadmap.ll[i].systems;
			}

			return null;
		},
		write: ({ level, idx, id, data }) => {
			const systems = configureSystems(level);
			let removedId = null;

			if (!id) {
				id = systems.splice(idx, 1)[0]?.id;
				removedId = id;
			}
			else {
				const removedId = systems[idx]?.id;
				systems[idx] = { id, data };
			}

			// if a mod, remove its application to a weapon
			// CHECK: does this use the same mod id or does the system id differ
			if (removedId && srcData.mods.has(removedId)) {
				const mounts = deepCopyMounts(level);
				for (const mount of mounts) {
					const source = mount.weapons.find(weapon =>
						weapon.attachments?.includes(id));
					moveAttachment({ id, source });
				}
			}
		},
		getLabel: ({ id }) => {
			return id ? (srcData.systems.get(id)?.name ?? '') :
				'Select a system';
		},
		applyDescription: renderSystemDescription,
		getEligibility: ({ level, id, selectedId }) =>
			isSystemEligible(level, id, selectedId),
		changeEvent: (selector, level) => systemUpdate(selector, level)
	}
});

export function getSelectorValue(selector) {
	return selector.value === '' ? null : selector.value;
}

export function setSelectorValue(selector, id, template, extraContext = {}) {
	const context = {
		...extraContext,
		level: Number(selector.dataset.ll),
		id,
		selectedId: id
	};
	const label = selector.querySelector('.selector-value');
	const control = selector.querySelector('.selector-control');

	selector.value = id;

	if (label && template.redrawLabels)
		label.textContent = template.getLabel?.(context) ?? '';
}

export function setSelectorClass(selector, className, toggle = true) {
	selector.querySelector('.selector-control')
		.classList.toggle(className, toggle);
}

export function setOptionHidden(option, hide = true) {
	option.disabled = hide;
	option.hidden = hide;
	option.style.display = hide ? 'none' : '';
}

/**
 * Find the best location to place the selector menu
 * Prefers under selector to over, takes the nearest possible x-pos
 * 
 * @param {any} selector
 * @returns
 */
function positionSelectorMenu(selector) {
	const control = selector?.querySelector('.selector-control');
	const menu = selectorMenus.get(selector);
	if (!control || !menu)
		return;

	// get dimensions of working area
	const gap = 4;
	const viewportGap = 8;
	const controlRect = control.getBoundingClientRect();

	menu.style.minWidth = `${controlRect.width}px`;

	const menuRect = menu.getBoundingClientRect();
	const left = Math.min(
		Math.max(viewportGap, controlRect.left),
		Math.max(viewportGap, window.innerWidth - menuRect.width - viewportGap)
	);
	const spaceBelow = window.innerHeight - controlRect.bottom;
	const spaceAbove = controlRect.top;

	// choose the suitable region that can fit the menu
	const top = menuRect.height + gap > spaceBelow && spaceAbove > spaceBelow ?
		Math.max(viewportGap, controlRect.top - menuRect.height - gap) :
		controlRect.bottom + gap;

	menu.style.left = `${left}px`;
	menu.style.top = `${top}px`;
}

/**
 * Render selector menu on the menu overlay layer
 * 
 * @param {HTMLDivElement} selector
 * @param {boolean} doOpen
 */
export function setSelectorOpen(selector, doOpen) {
	if (!selector)
		return;

	selector.classList.toggle('open', doOpen);
	const menu = selectorMenus.get(selector);
	if (!doOpen) {
		hideInfoBubble();
		if (activeSelector === selector)
			activeSelector = null;
		if (menu && menu.parentElement !== selector)
			selector.append(menu);
		return;
	}

	activeSelector = selector;
	selectorOverlay.append(menu);
	positionSelectorMenu(selector);
}

export function renderOption(template, source, context) {
	const option = document.createElement('div');
	option.className = 'selector-option';
	option.value = context.id;

	// selections with supported manufacturers get logos
	const logoUrl = false;// MANUFACTURER_LOGOS.get(source);
	if (logoUrl) {
		const icon = document.createElement('img');
		icon.className = 'selector-source-icon';
		icon.src = logoUrl;
		icon.alt = '';
		option.classList.add('has-source-icon');
		option.append(icon);
	}

	const name = document.createElement('span');
	name.textContent = template.getLabel?.(context) ?? '';
	option.append(name);

	if (!template.getEligibility?.(context) ?? false)
		setOptionHidden(option, true);

	return option;
}

/**
 * Creates a selector of a given type
 * configured for its level and selected value, if any
 * 
 * @param {number} level
 * @param {string} selectedId
 * @param {Object} template
 * @returns {HTMLElement}
 */
export function renderSelector(
	level,
	selectedId,
	template,
	extraContext = {}
) {
	if (!template)
		return;

	const context = { ...extraContext, level, id: selectedId, selectedId };

	const selector = document.createElement('div');
	selector.className = `custom-select ${template.type}`;
	selector.dataset.ll = level;
	selector.value = selectedId;

	const controlRow = document.createElement('div');
	controlRow.className = 'selector-control-row';

	const control = document.createElement('button');
	control.className = 'selector-control';
	control.classList.toggle('occupied', selectedId);
	control.type = 'button';

	const value = document.createElement('span');
	value.className = 'selector-value';
	value.textContent = template.getLabel?.(context) ?? '';

	const arrow = document.createElement('span');
	arrow.className = 'selector-arrow';

	control.append(value, arrow);

	const menu = document.createElement('div');
	menu.className = 'selector-menu';
	selectorMenus.set(selector, menu);

	// suppress default-close behavior when menu option is clicked
	menu.addEventListener('mousedown', event => event.preventDefault());

	for (const [id, item] of template.getSrcItems()) {
		// prepare an option for each item
		const context = { ...extraContext, level, id, selectedId };
		menu.append(renderOption(template, item.source, context));
	}

	const getControlContent = () => selector.value ?
		template.applyDescription?.({
			...extraContext,
			level,
			id: selector.value,
			selectedId: selector.value
		}) : null;

	const getOptionContent = option =>
		template.applyDescription?.({
			...extraContext,
			level,
			id: option.value,
			selectedId: selector.value
		});

	infoSources.set(control, getControlContent);
	infoSources.set(menu, getOptionContent);

	// handle user making a new selection
	menu.addEventListener('click', event => {
		const option = event.target.closest('.selector-option');
		if (!option)
			return;

		selector.value = option.value;
		value.textContent = option.textContent;
		template.changeEvent(selector, level);
		console.log(roadmap);
		setSelectorOpen(selector, false);
	});

	if (!template.getEligibility?.(context) ?? false)
		control.classList.add('error');

	control.addEventListener('keydown', event => {
		switch (event.key) {
			case 'Escape':
				setSelectorOpen(selector, false);
				break;
			default:
				break;
		}
	});

	// loss of focus simply closes the menu
	control.addEventListener('blur', event => {
		if (!selector.contains(event.relatedTarget) &&
			!menu.contains(event.relatedTarget))
			setSelectorOpen(selector, false);
	});

	controlRow.append(control);

	// remove/clear selector button
	if (template.allowClear) {
		control.classList.add('clearable');
		const clear = document.createElement('button');
		clear.className = 'clear';
		clear.type = 'button';
		clear.title = 'Clear selection';
		clear.setAttribute('aria-label', 'Clear selection');
		clear.addEventListener('click', () => {
			selector.value = null;
			value.textContent = template.getLabel?.({
				...extraContext,
				level,
				id: null,
				selectedId: null
			}) ?? '';
			template.changeEvent(selector, level);
			setSelectorOpen(selector, false);
		});
		controlRow.append(clear);
	}

	selector.append(controlRow);

	control.addEventListener('click', () =>
		setSelectorOpen(selector, !selector.classList.contains('open')));

	selector.append(menu);

	return selector;
}

/**
 * Creates a weapon selector with default options configured
 * 
 * @param {number} level
 * @param {Object} weapon
 * @returns {HTMLElement}
 */
export function renderWeaponSelector(
	level,
	mountIdx,
	slotIdx,
	slot,
	weapon
) {
	const selectedId = weapon?.id ?? null;
	const selector = renderSelector(
		level,
		selectedId,
		SELECT_TEMPLATE.WEAPON,
		{ slot }
	);
	selector.dataset.mountIdx = mountIdx;
	selector.dataset.slotIdx = slotIdx;

	if (!srcData.weapons.get(selectedId)?.no_mods)
		applyAttachmentManager(level, selector);
	selector.append(renderWeaponTags(
		level, weapon, mountIdx, slotIdx));

	return selector;
}

function sortEquipment(a, b) {
	const exoticA = doesItemHaveTag(a[1], TAGS.EXOTIC);
	const exoticB = doesItemHaveTag(b[1], TAGS.EXOTIC);
	if (exoticA != exoticB)
		return exoticA;

	if ((a[1].source === 'GMS') != (b[1].source === 'GMS'))
		return a[1].source === 'GMS';
	if (a[1].source !== b[1].source)
		return MANUFACTURERS[a[1].source] >
			MANUFACTURERS[b[1].source];

	if (a[1].license_id !== b[1].license_id) {
		const licenseA = srcData.licenses.get(a[1].license_id);
		const licenseB = srcData.licenses.get(b[1].license_id);
		if (!licenseA)
			return -1;
		if (!licenseB)
			return 1;
		return licenseA.name.toLowerCase() >
			licenseB.name.toLowerCase();
	}

	if (a[1].mount !== b[1].mount)
		return MOUNTS[a[1].mount] > MOUNTS[b[1].mount];

	return a[1].name.toLowerCase() > b[1].name.toLowerCase();
}

/**
 * General solution to several sub-items attached to selector items:
 * - special actions
 * - deployable objects + characters
 * - special ammunition
 * 
 * Recursively deploys sub-items into a single appendable div
 * Uses an ancestor object as a fallback reference
 * 
 * @param {Object} item
 * @param {Object} ancestor
 * @returns {HTMLDivElement}
 */
function renderSubItemDescription(item, ancestor = null) {
	const container = document.createElement('div');

	const itemDescription = item.detail ?? item.description ?? null;

	if (itemDescription) {
		const ancestorDescription =
			ancestor?.detail ?? ancestor?.description ?? null;

		// skip entirely if this item duplicates its ancestor
		if (ancestorDescription && itemDescription === ancestorDescription)
			return null;

		const name = document.createElement('h4');
		const nameText = document.createElement('span');
		nameText.className = 'header-text';
		nameText.innerHTML = item.name ?? ancestor.name;
		name.append(nameText);

		// actions and deployables get tags alongside their name
		if (item.activation || item.type) {
			const type = document.createElement('span');
			type.className = 'tags tag';
			if (item.frequency)
				type.textContent += `${item.frequency} `;
			if (item.activation)
				type.classList.add(item.activation
					.replace(/\s+/g, '-').toLowerCase());
			type.textContent += item.activation ?? item.type;
			name.append(type);
		}

		const description = document.createElement('p');
		description.innerHTML = itemDescription
			?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');

		container.append(name, description);
	}

	// this sub-item may itself grant special actions: render them below it
	for (const subItem of item.actions ?? []) {
		const subItemDiv = renderSubItemDescription(subItem, item);
		if (subItemDiv) {
			subItemDiv.classList.add('indent');
			container.append(subItemDiv);
		}
	}

	return container;
}

/* info bubble content renderers for complex items */

function renderTalentDescription({ level, id, selectedId }) {
	const content = [];

	const rank = getTalentRank(level, id, selectedId);
	const rankData = srcData.talents.get(id)?.ranks[rank];
	if (!rankData)
		return null;

	const rankName = document.createElement('h3');
	rankName.textContent = rankData.name;
	const rankDescription = document.createElement('p');
	rankDescription.innerHTML =
		rankData.description?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');

	content.push(rankName, rankDescription);

	for (const action of rankData.actions ?? [])
		content.push(renderSubItemDescription(action, rankData));

	return content;
}

function renderLicenseDescription({ level, id, selectedId }) {
	const content = document.createElement('p');

	const rank = getLicenseRank(level, id, selectedId);
	const licenseItems = srcData.licenses.get(id).items[rank];

	for (const id of licenseItems) {
		const item = srcData.systems.get(id) ?? srcData.weapons.get(id);
		if (item)
			content.innerHTML += item.name + '<br>';
	}

	return content;
}

function renderFrameDescription({ level, id }) {
	const content = [];

	const frame = srcData.frames.get(id);
	if (!frame)
		return null;

	const tags = document.createElement('span');
	tags.className = 'tags';
	for (const type of frame.mechtype ?? []) {
		const tag = document.createElement('div');
		tag.className = 'tag';
		tag.textContent = type;
		tags.append(tag);
	}
	content.push(tags);

	for (const trait of frame.traits ?? [])
		content.push(renderSubItemDescription(trait));

	if (frame.core_system) {
		const coreSystem = frame.core_system;

		const coreName = document.createElement('h3');
		coreName.textContent = `Core System: ${coreSystem.name}`;

		const corePowerDiv = document.createElement('div');
		corePowerDiv.className = 'core-power-info';
		corePowerDiv.append(coreName);

		if (coreSystem.passive_name) {
			corePowerDiv.append(renderSubItemDescription({
				name: `Passive: <u>${coreSystem.passive_name}</u>`,
				detail: coreSystem.passive_effect,
				actions: coreSystem.passive_actions
			}));
		}

		corePowerDiv.append(renderSubItemDescription({
			name: `Active: <u>${coreSystem.active_name}</u>`,
			activation: coreSystem.activation,
			detail: coreSystem.active_effect,
			actions: coreSystem.active_actions
		}));

		content.push(corePowerDiv);
	}

	return content;
}

function renderSystemDescription({ level, id }) {
	const content = [];

	const item = srcData.systems.get(id);
	if (!item)
		return null;

	const tags = renderSystemTags(level, id, true);
	if (tags.childElementCount) {
		tags.style.justifyContent = 'right';
		content.push(tags);
	}

	if (item.effect) {
		const systemDescription = document.createElement('p');
		systemDescription.innerHTML = item.effect
			?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
		content.push(systemDescription);
	}

	const subItems = [
		...item.ammo ?? [],
		...item.actions ?? [],
		...item.deployables ?? []
	];

	for (const action of subItems)
		content.push(renderSubItemDescription(action, item));

	return content;
}

function renderTextAddendum(data, name) {
	const description = (typeof data === 'string' ? data : data.detail)
		?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
	const textElement = document.createElement('p');
	if (name)
		textElement.innerHTML += `<b>${name}:</b> `; 
	textElement.innerHTML += description;
	return textElement;
}

function renderWeaponDescription({ level, id }) {
	const content = [];

	const item = srcData.weapons.get(id);

	const header = document.createElement('h4');
	header.textContent = `${item.mount} ${item.type}`;
	// add weapon tags
	const tags = renderWeaponTags(level, { id }, -1, -1, true);
	if (tags.childElementCount) {
		tags.style.justifyContent = 'right';
		header.append(tags);
	}
	content.push(header);

	for (const profile of item.profiles ?? [item]) {
		if (profile.name !== item.name) {
			const profileName = document.createElement('h4');
			profileName.textContent = profile.name;
			content.push(profileName);
		}

		if (profile.effect) {
			const description = document.createElement('p');
			description.innerHTML = profile.effect
				?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
			content.push(description);
		}

		if (profile.range) {
			const rangeDiv = document.createElement('p');
			rangeDiv.className = 'range';
			for (const rangeData of profile.range) {
				const range = document.createElement('span');
				range.innerHTML = `<b>${rangeData.type}:</b> ${rangeData.val}`;
				rangeDiv.append(range);
			}
			content.push(rangeDiv);
		}

		if (profile.damage) {
			const damageDiv = document.createElement('p');
			damageDiv.className = 'damage';
			for (const damageData of profile.damage) {
				const damage = document.createElement('span');
				damage.innerHTML = `${damageData.val} ${damageData.type}`;
				damageDiv.append(damage);
			}
			content.push(damageDiv);
		}

		if (profile.on_attack)
			content.push(renderTextAddendum(profile.on_attack, 'On Attack'));
		if (profile.on_hit)
			content.push(renderTextAddendum(profile.on_hit, 'On Hit'));
		if (profile.on_crit)
			content.push(renderTextAddendum(profile.on_crit, 'On Crit'));
		if (profile.on_miss)
			content.push(renderTextAddendum(profile.on_miss, 'On Miss'));

		const subItems = [
			...profile.ammo ?? [],
			...profile.actions ?? [],
			...profile.deployables ?? []
		];

		for (const action of subItems)
			content.push(renderSubItemDescription(action, profile));
	}

	return content;
}

window.addEventListener('resize', () => {
	positionSelectorMenu(activeSelector);
});
window.addEventListener('scroll', () => {
	positionSelectorMenu(activeSelector);
});