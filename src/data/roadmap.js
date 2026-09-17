// data/roadmap.js

import {
	ATTACHMENT_ID,
	getEligibleAttachments,
	getUnusedAttachments
} from "../rules/attachments";

const MAX_LICENSE_LEVEL = 12;

export let roadmap = {};

/**
 * Return the number of advancement choices
 * granted at a LL
 *
 * @param {number} level
 * @returns {{
 *		skillTriggers: number,
 *		talents: number,
 *		licenses: number,
 *		coreBonuses: number
 * }}
 */
function getChoiceLimits(level) {
	if (level === 0) {
		return {
			skillTriggers: 4,
			talents: 3,
			mechSkills: 2
		};
	}

	return {
		skillTriggers: 1,
		talents: 1,
		mechSkills: 1
	};
}

/**
 * Makes empty arrays of the specified length
 * 
 * @param {number} length
 * @returns {Array<null>}
 */
function createEmptySlots(length) {
	return Array.from({ length }, () => null);
}

/**
 * Create a blank level for the roadmap
 * LL0 starts with the Everest loaded in
 * 
 * @param {any} level
 * @returns
 */
function createDefaultRoadmapLevel(level) {
	const limits = getChoiceLimits(level);

	return {
		skillTriggerIds: createEmptySlots(limits.skillTriggers),
		talentIds: createEmptySlots(limits.talents),
		haseIds: createEmptySlots(limits.mechSkills),
		licenseId: null,
		coreBonusId: null,
		// null means "inherit the previous level's mounts"
		mounts: level !== 0 ? null :
			[
				{ type: 'Main', weapons: [{ id: null }] },
				{ type: 'Flex', weapons: [{ id: null }] },
				{ type: 'Heavy', weapons: [{ id: null }] }
			],
		systems: [],
		// null means "continue using the previously active frame"
		frameId: level !== 0 ? null : 'mf_standard_pattern_i_everest'
	};
}

/**
 * Configure roadmap to default blank
 */
export function createDefaultRoadmap() {
	roadmap = {
		name: 'New Roadmap',
		maxLevel: MAX_LICENSE_LEVEL,
		allowExotics: true,
		ll: Array.from(
			{ length: MAX_LICENSE_LEVEL + 1 },
			(_, level) => createDefaultRoadmapLevel(level)
		)
	};

	console.log(roadmap);
}

export function getEffectiveSystems(level) {
	for (let i = level; i >= 0; i--) {
		if (roadmap.ll[i].systems?.length > 0)
			return roadmap.ll[i].systems;
	}

	return [];
}

/**
 * Resize roadmap to match new maximum level
 * 
 * @param {Roadmap} roadmap
 * @param {number} maxLevel
 */
export function setMaxLevel(roadmap, maxLevel) {
	if (maxLevel > roadmap.maxLevel) {
		for (let i = roadmap.maxLevel + 1; i <= maxLevel; i++)
			roadmap.ll.push(createDefaultRoadmapLevel(i));
	}
	else if (maxLevel < roadmap.maxLevel) {
		roadmap.ll.length = maxLevel + 1;
	}

	roadmap.maxLevel = maxLevel;
}

function nullInvalidId(id, collection) {
	return id && collection.has(id) ? id : null;
}

function sourceIsAvailable(id, sourceData) {
	return !id ||
		sourceData.frames.has(id) ||
		sourceData.talents.has(id) ||
		sourceData.coreBonuses.has(id);
}

export async function loadRoadmapFile(file) {
	let loadedRoadmap;
	try {
		loadedRoadmap = JSON.parse(await file.text());
	}
	catch {
		throw new Error('Not a valid roadmap file.');
	}

	const hasValidShape = loadedRoadmap &&
		typeof loadedRoadmap === 'object' &&
		!Array.isArray(loadedRoadmap) &&
		typeof loadedRoadmap.name === 'string' &&
		Number.isInteger(loadedRoadmap.maxLevel) &&
		loadedRoadmap.maxLevel >= 0 &&
		loadedRoadmap.maxLevel <= MAX_LICENSE_LEVEL &&
		Array.isArray(loadedRoadmap.ll) &&
		loadedRoadmap.ll.length === loadedRoadmap.maxLevel + 1 &&
		loadedRoadmap.ll.every(level => level && typeof level === 'object');

	if (!hasValidShape)
		throw new Error('Not a valid roadmap file.');

	roadmap = loadedRoadmap;
}
export function saveRoadmapFile() {
	const json = JSON.stringify(roadmap, null, '\t');
	const blob = new Blob([json], { type: "application/json" });

	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = roadmap.name;
	link.click();

	URL.revokeObjectURL(link.href);
}

/**
 * Clear/remove all roadmap references to selections
 * from unloaded LCPs
 *
 * @param {Object} sourceData
 */
export function cleanRoadmapAfterLcpRemove(sourceData) {
	for (let level = 0; level < roadmap.ll.length; level++) {
		const data = roadmap.ll[level];
		data.skillTriggerIds = data.skillTriggerIds.map(id =>
			nullInvalidId(id, sourceData.skillTriggers));
		data.talentIds = data.talentIds.map(id =>
			nullInvalidId(id, sourceData.talents));
		data.licenseId = nullInvalidId(
			data.licenseId, sourceData.licenses);
		data.coreBonusId = nullInvalidId(
			data.coreBonusId, sourceData.coreBonuses);
		data.frameId = nullInvalidId(
			data.frameId, sourceData.frames);

		// system and mod lists size adaptively
		data.systems = data.systems.filter(system =>
			nullInvalidId(system.id, sourceData.systems));

		if (!Array.isArray(data.mounts))
			continue;

		let retainedMountCount = 0;
		
		const eligibleAttachments = getEligibleAttachments(level);
		
		// remove invalid mounts
		// TODO: properly reconcile mount changes from invalid frame disposal
		data.mounts.filter(mount =>
			sourceIsAvailable(mount.source, sourceData));

		const hasSuperheavy = data.mounts.some(mount =>
			(mount.weapons ?? []).some(weapon =>
				sourceData.weapons.get(weapon.id)?.mount === 'Superheavy'));

		for (const mount of data.mounts) {
			// remove invalid weapons and attachments
			mount.weapons.map(weapon => {
				if (sourceData.weapons.has(weapon.id)) {
					weapon.attachments?.filter(attachment =>
						attachment === ATTACHMENT_ID.OVERPOWER_CALIBER ||
						sourceData.mods.has(attachment)
					)
					return weapon;
				}
				else {
					return { id: null };
				}
			});

			// remove invalid mount attachments
			if (mount.attachments) {
				mount.attachments = mount.attachments.filter(id => {
					if (id === ATTACHMENT_ID.SUPERHEAVY_BRACING)
						return hasSuperheavy;
					else
						return id === ATTACHMENT_ID.AUTO_STABILIZING || 
							id === ATTACHMENT_ID.MOUNT_RETROFITTING;
				});
				if (!mount.attachments.length)
					delete mount.attachments;
			}
		}

	}
}