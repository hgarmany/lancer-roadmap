// rules/weapons.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

import {
	MAX_MOUNT_COUNT
} from '../constants.js';

import {
	getEffectiveFrameId
} from './frames.js';

import {
	ATTACHMENT_ID
} from './attachments.js';

import {
	TAGS,
	doesItemHaveTag,
	getItemNumUses,
	isFrameIntegratedItem
} from './installsCommon.js';
import { mountTagUpdate } from '../ui/updates.js';

const talents = cumulativeCatalog.talents;
const licenses = cumulativeCatalog.licenses;
const coreBonuses = cumulativeCatalog.coreBonuses;
const activeFrame = cumulativeCatalog.activeFrame;
const stats = cumulativeCatalog.stats;

const AUXILIARY_SLOT = Object.freeze({
	label: 'Aux',
	allowedWeaponMounts: Object.freeze(['Auxiliary'])
});

const MAIN_SLOT = Object.freeze({
	label: 'Main / Aux',
	allowedWeaponMounts: Object.freeze(['Main', 'Auxiliary'])
});

const HEAVY_SLOT = Object.freeze({
	label: 'Heavy / Main / Aux',
	allowedWeaponMounts: Object.freeze([
		'Superheavy',
		'Heavy',
		'Main',
		'Auxiliary'
	])
});

const SUPERHEAVY_SLOT = Object.freeze({
	label: 'Superheavy',
	allowedWeaponMounts: Object.freeze(['Superheavy'])
});

const SHIP_CLASS = Object.freeze({
	label: 'Ship-Class',
	allowedWeaponMounts: Object.freeze(['Ship-class'])
});

export const MOUNT_SLOTS = Object.freeze({
	'Ship-class': Object.freeze([SHIP_CLASS]),
	'Superheavy': Object.freeze([SUPERHEAVY_SLOT]),
	'Heavy': Object.freeze([HEAVY_SLOT]),
	'Main': Object.freeze([MAIN_SLOT]),
	'Flex': Object.freeze([MAIN_SLOT]),
	'Main/Aux': Object.freeze([MAIN_SLOT, AUXILIARY_SLOT]),
	'Aux/Aux': Object.freeze([AUXILIARY_SLOT, AUXILIARY_SLOT]),
	'Aux': Object.freeze([AUXILIARY_SLOT])
});

/**
 * Get the number of uses a limited weapon has
 * Non-limited weapons return 0
 * 
 * @param {number} level
 * @param {string} id
 * @returns {string}
 */
export function getWeaponNumUses(level, id) {
	return getItemNumUses(level, srcData.weapons.get(id));
}

/**
 * Get the mount type after special mount alterations are applied
 *
 * @param {Object} mount
 * @returns {string}
 */
export function getEffectiveMountType(mount) {
	return mount.attachments?.includes(
		ATTACHMENT_ID.MOUNT_RETROFITTING)
		? 'Main/Aux'
		: mount.type;
}

/**
 * Get essential slot information for a given mount
 * Configuration responds to installed weapons
 * 
 * @param {Object} mount
 * @returns {Array<Object>}
 * 
 */
export function getMountSlots(mount) {
	if (mount.attachments?.includes(
		ATTACHMENT_ID.SUPERHEAVY_BRACING))
		return [];

	const mountType = getEffectiveMountType(mount);
	if (mountType !== 'Flex')
		return MOUNT_SLOTS[mountType] ?? [];

	// flex mount acts like an aux/aux mount
	// if either slot has an aux weapon
	const firstWeapon = srcData.weapons.get(mount.weapons?.[0]?.id);
	const secondWeapon = srcData.weapons.get(mount.weapons?.[1]?.id);
	const doTwoSlots = firstWeapon?.mount === 'Auxiliary' ||
		!firstWeapon && secondWeapon?.mount === 'Auxiliary';
	return doTwoSlots ? [MAIN_SLOT, AUXILIARY_SLOT] : [MAIN_SLOT];
}

function createEmptyMount(type) {
	return { type, weapons: MOUNT_SLOTS[type].map(() => ({ id: null })) };
}

/**
 * Builds a list of weaponless mounts from scratch
 * 
 * @param {number} level
 * @returns
 */
function buildMountConfiguration(level) {
	const frame = srcData.frames.get(activeFrame[level]);
	const frameMounts = frame?.mounts
		?.map(mount => createEmptyMount(mount)) ?? [];
	let numMounts = frameMounts.length;
	let mountsOut = [];

	// integrated mount changes
	const frameIntegrations = frame?.core_system?.integrated
		?.map(weapon => ({ source: activeFrame[level], weapon })) ?? [];
	const talentIntegrations = [...talents[level]].flatMap(([id, rank]) =>
		srcData.talents.get(id)?.ranks[rank - 1]?.integrated
			?.map(weapon => ({ source: id, weapon })) ?? []);
	const integratedElements = [
		...frameIntegrations,
		...talentIntegrations
	];

	for (const integration of integratedElements ?? []) {
		const weapon = srcData.weapons.get(integration.weapon);
		if (weapon) {
			const newMount = {
				type: weapon.mount,
				weapons: [{ id: integration.weapon }],
				source: integration.source,
				integrated: integration.weapon
			};
			mountsOut.push(newMount);
		}
	}

	// source bonus mounts from core bonuses
	for (const coreBonus of coreBonuses[level] ?? []) {
		const srcCB = srcData.coreBonuses.get(coreBonus);

		if (!srcCB?.bonuses)
			continue;

		for (const bonus of srcCB?.bonuses) {
			if (bonus.id === 'add_mount' &&
				(!bonus.max || bonus.max > numMounts)
			) {
				const mountName = bonus.val.charAt(0).toUpperCase() +
					bonus.val.slice(1);
				mountsOut.push(createEmptyMount(mountName));
				numMounts++;
			}
			if (bonus.id === 'superheavy_mounting' && numMounts < 3) {
				mountsOut.push(createEmptyMount('Superheavy'));
				numMounts++;
			}
		}
	}

	return mountsOut.concat(frameMounts);
}

export function cloneMount(mount, attachments = null) {
	const newMount = {
		...mount,
		weapons: (mount.weapons ?? []).map(weapon => {
			const newWeapon = { ...weapon };
			if (weapon.attachments?.length)
				newWeapon.attachments = [...weapon.attachments];
			if (!newWeapon.attachments?.length)
				delete newWeapon.attachments;
			return newWeapon;
		})
	};

	if (mount.attachments?.length)
		newMount.attachments = [...mount.attachments];
	if (attachments?.length) {
		newMount.attachments ??= [];
		newMount.attachments.push(...attachments);
	}
	if (!newMount.attachments?.length)
		delete newMount.attachments;

	return newMount;
}

function mountsHaveSameSource(savedMount, newMount) {
	const savedIntegrated = savedMount.integrated;
	const newIntegrated = newMount.integrated;

	if (savedIntegrated || newIntegrated) {
		return savedMount.type === newMount.type &&
			savedIntegrated === newIntegrated;
	}

	return savedMount.type === newMount.type &&
		savedMount.source === newMount.source;
}

/**
 * Reconcile saved selections with all mounts currently granted at a level
 *
 * @param {number} level
 * @param {Array<Object>} savedMounts
 * @returns {Array<Object>}
 */
export function normalizeMounts(level, savedMounts = []) {
	const unmatchedMounts = [...savedMounts];
	const newMounts = buildMountConfiguration(level);

	for (let i = 0; i < newMounts.length; i++) {
		const matchingMountIdx = unmatchedMounts.findIndex(
			mount => mountsHaveSameSource(mount, newMounts[i]));
		if (matchingMountIdx < 0)
			continue;

		const savedMount = unmatchedMounts.splice(matchingMountIdx, 1)[0];

		if (!newMounts[i].integrated)
			newMounts[i] = cloneMount(savedMount, newMounts[i].attachments);
	}

	return newMounts;
}

/**
 * Get the last populated weapon loadout up to this level
 * 
 * @param {number} level
 * @returns {Array<Object>}
 */
export function getEffectiveMounts(level) {
	for (let i = level; i >= 0; i--) {
		if (roadmap.ll[i].mounts)
			return roadmap.ll[i].mounts;
	}

	return [];
}

/**
 * Produces a string to uniquely identify mount configurations
 * Is agnostic toward the actual contents of mounts: weapons, mods, etc.
 * 
 * @param {Array<Object>} mounts
 * @returns {string}
 */
function getMountConfigurationKey(mounts) {
	return JSON.stringify(mounts.map(mount => [
		mount.type,
		mount.source ?? null,
		mount.integrated ?? null
	]));
}

/**
 * Produce a deep copy of this level's effective mounts
 * and write it to the roadmap
 *
 * @param {number} level
 * @returns {Array<Object>}
 */
export function deepCopyMounts(level) {
	const mounts = getEffectiveMounts(level).map(mount => cloneMount(mount));
	roadmap.ll[level].mounts = mounts;
	return mounts;
}

/**
 * Create this level's own loadout before applying a user weapon selection
 * The derived configuration is cloned so prior levels remain unchanged
 *
 * @param {number} level
 * @returns {Array<Object>}
 */
export function reconfigureMounts(level) {
	const effectiveMounts = getEffectiveMounts(level);
	const normalizedMounts = normalizeMounts(level, effectiveMounts);
	if (getMountConfigurationKey(normalizedMounts) ===
		getMountConfigurationKey(effectiveMounts))
		return effectiveMounts;

	roadmap.ll[level].mounts = normalizedMounts;

	return normalizedMounts;
}

/**
 * Resize a Flex mount when its first weapon changes size
 * Transfers mods to new mount type as necessary
 *
 * @param {number} level
 * @param {Object} mount
 */
function resizeFlexMount(level, mount) {
	const slotCount = getMountSlots(mount).length;

	if (mount.weapons.length > slotCount)
		mount.weapons.length = 1;
	else if (mount.weapons.length < slotCount)
		mount.weapons.push({ id: null });
}

/**
 * Resize a mount to the correct number of slots
 * 
 * @param {number} level
 * @param {Object} mount
 */
function updateMountSlotCount(level, mount) {
	const slotCount = getMountSlots(mount).length;
	while (mount.weapons.length > slotCount)
		mount.weapons.pop();
	while (mount.weapons.length < slotCount)
		mount.weapons.push({ id: null });
}

// reset level to inherited mounts if all weapon slots are empty
export function resetEmptyMounts(level) {
	const activeFrame = getEffectiveFrameId(level);
	const mounts = roadmap.ll[level].mounts;
	if (mounts && !mounts.some(mount =>
		mount.weapons.some(weapon => weapon.id))
	) {
		// search in descending order for the most recent explicit mount config
		for (let i = level - 1; i >= 0; i--) {
			if (roadmap.ll[i].frame && roadmap.ll[i].frame !== activeFrame)
				return false;
			
			// can only reset if there is a lower level w/ the same mounts +
			// no missing attachments
			const targetMounts = roadmap.ll[i].mounts;
			if (targetMounts) {
				if (mounts.every((mount, mountIdx) =>
						mount.type === targetMounts[mountIdx].type &&
						(mount.attachments?.every(attachment =>
							targetMounts[mountIdx].attachments
							?.includes(attachment)) ?? true)
					)
				) {
					roadmap.ll[level].mounts = null;
					return true;
				}
				else
					return false;
			}
		}
	}

	return false;
}

/**
 * Apply a weapon selection to an existing mount
 * Where a level's loadout is inherited, create a new roadmap entry
 *
 * @param {number} level
 * @param {number} mountIdx
 * @param {number} slotIdx
 * @param {string} id
 */
export function setWeaponSelection(level, mountIdx, slotIdx, id) {
	const mounts = normalizeMounts(level, getEffectiveMounts(level));
	const mount = mounts[mountIdx];
	if (!mount)
		return;
	roadmap.ll[level].mounts = mounts;

	const weapon = mount.weapons[slotIdx];

	// insert new weapon data
	weapon.id = id ?? null;
	if (!id)
		delete weapon.attachments;

	// dynamic weapon slots for flex mounts
	if (mount.type === 'Flex')
		resizeFlexMount(level, mount);

	if(resetEmptyMounts(level))
		mountTagUpdate(level, [...Array(mounts.length).keys()]);
}

/**
 * Determine whether the weapon with the given id
 * is a valid choice at this level
 * 
 * @param {number} level
 * @param {string} id
 * @param {string} selectedId
 * @returns {boolean}
 */
export function isWeaponEligible(
	level,
	id,
	selectedId = null,
	slotDefinition = null
) {
	if (!id)
		return true;

	const candidate = srcData.weapons.get(id);
	const mounts = getEffectiveMounts(level);
	const isExotic = doesItemHaveTag(srcData.weapons.get(id), TAGS.EXOTIC);

	// simple rejection conditions
	if (!candidate ||
		// unpermitted exotics
		!roadmap.allowExotics && isExotic ||
		// frame-integrated weapons
		isFrameIntegratedItem(id) ||
		// talent-integrated weapons
		candidate.talent_item ||
		// weapons too large for the target slot
		!slotDefinition?.allowedWeaponMounts.includes(candidate.mount) ||
		// superheavy weapons with no spare mount to brace on
		candidate.mount === 'Superheavy' && mounts.length < 2)
		return false;

	// determine whether adding/swapping weapons is within the level's budget
	if (candidate.sp) {
		const selectedWeapon = selectedId ? srcData.weapons.get(selectedId) : null;
		const withinBudget =
			Number(candidate.sp ?? 0) - Number(selectedWeapon?.sp ?? 0) <=
			stats[level].sp_budget;

		if (!withinBudget)
			return false;
	}
	
	// check for uniques, reject unique weapons already installed
	if (doesItemHaveTag(srcData.weapons.get(id), TAGS.UNIQUE) &&
		id !== selectedId &&
		mounts.flatMap(mount => mount.weapons)
			.some(weapon => weapon.id === id))
		return false;

	// exotics need no license
	if (isExotic)
		return true;

	// all other weapons must satisfy or lack a license requirement
	if (!candidate.license_id || candidate.license_id === 'GMS')
		return true;

	// allow weapons at or below the level's license rank
	return candidate.license_level <=
		licenses[level].get(candidate.license_id);
}