// data/cumulativeCatalog.js

import {
	roadmap
} from './roadmap.js';

import {
	calculateMechStats
} from '../rules/stats.js';

export const cumulativeCatalog = {
	skillTriggers: [],
	talents: [],
	hase: [],
	licenses: [],
	activeFrame: [],
	coreBonuses: [],
	stats: []
};

/**
 * Clear all data from catalog
 */
export function purgeCumulativeCatalog() {
	for (const catalog of Object.values(cumulativeCatalog))
		catalog.length = 0;
}

/**
 * Reset a catalog level to the contents of the previous level
 * 
 * @param {Number} level 
 * @returns 
 */
function initializeCatalogLevel(level) {
	if (level === 0) {
		cumulativeCatalog.skillTriggers[level] = new Map();
		cumulativeCatalog.talents[level] = new Map();
		cumulativeCatalog.hase[level] = new Map();
		cumulativeCatalog.licenses[level] = new Map();
		cumulativeCatalog.coreBonuses[level] = [];
		cumulativeCatalog.activeFrame[level] = null;
		cumulativeCatalog.stats[level] = {};

		return;
	}

	const previousLevel = level - 1;

	cumulativeCatalog.skillTriggers[level] =
		new Map(cumulativeCatalog.skillTriggers[previousLevel]);

	cumulativeCatalog.talents[level] =
		new Map(cumulativeCatalog.talents[previousLevel]);

	cumulativeCatalog.hase[level] =
		new Map(cumulativeCatalog.hase[previousLevel]);

	cumulativeCatalog.licenses[level] =
		new Map(cumulativeCatalog.licenses[previousLevel]);

	cumulativeCatalog.coreBonuses[level] = [
		...cumulativeCatalog.coreBonuses[previousLevel]
	];

	cumulativeCatalog.activeFrame[level] =
		cumulativeCatalog.activeFrame[previousLevel];

	cumulativeCatalog.stats[level] = {
		...cumulativeCatalog.stats[previousLevel]
	};
}

/**
 * Add a new id to the catalog or increment an existing one
 * 
 * @param {Map} catalogLevel 
 * @param {String} id
 */
function increment(catalogLevel, id) {
	if (catalogLevel instanceof Map)
		catalogLevel.set(id, (catalogLevel.get(id) ?? 0) + 1);
	else
		catalogLevel.push(id);
}

/**
 * Decrement an id in the catalog, removing ids that would point to a zero
 *
 * @param {Map} catalogLevel
 * @param {String} id
 */
function decrement(catalogLevel, id) {
	if (catalogLevel instanceof Map) {
		const newVal = (catalogLevel.get(id) ?? 0) - 1
		if (newVal > 0)
			catalogLevel.set(id, newVal);
		else
			catalogLevel.delete(id);
	}
	else {
		const idx = catalogLevel.indexOf(id);
		catalogLevel.splice(idx, 1);
	}
}

/**
 * Increment all instances of an id
 * in the cumulative catalog up from a starting level
 * 
 * @param {any} catalog
 * @param {any} id
 * @param {any} level
 */
export function incrementFromLevel(catalog, id, level) {
	if (!catalog || !id) return;
	for (let i = level; i <= roadmap.maxLevel; i++)
		increment(catalog[i], id);
}

/**
 * Decrement all instances of an id
 * in the cumulative catalog up from a starting level
 * 
 * @param {any} catalog
 * @param {any} id
 * @param {any} level
 */
export function decrementFromLevel(catalog, id, level) {
	if (!catalog || !id) return;
	for (let i = level; i <= roadmap.maxLevel; i++)
		decrement(catalog[i], id);
}

/**
 * Prepare a cumulative catalog reflecting the contents of the loaded roadmap
 */
export function initializeCatalog() {
	purgeCumulativeCatalog();

	for (let level = 0; level <= roadmap.maxLevel; level++) {
		const levelData = roadmap.ll[level];

		// prepare base catalog state
		initializeCatalogLevel(level);

		// load in skill triggers
		for (const skillTriggerId of levelData.skillTriggerIds) {
			if (skillTriggerId)
				increment(
					cumulativeCatalog.skillTriggers[level],
					skillTriggerId
				);
		}

		// load in talents
		for (const talentId of levelData.talentIds) {
			if (talentId)
				increment(
					cumulativeCatalog.talents[level],
					talentId
				);
		}

		// load in mech skills
		for (const haseId of levelData.haseIds) {
			if (haseId)
				increment(
					cumulativeCatalog.hase[level],
					haseId
				);
		}

		// load in license
		if (levelData.licenseId) {
			if (level === 0)
				throw new Error(`License found at invalid level LL${level}`);
			increment(
				cumulativeCatalog.licenses[level],
				levelData.licenseId
			);
		}

		// load in core bonus
		if (levelData.coreBonusId) {
			if (level === 0 || level % 3 !== 0)
				throw new Error(`Core bonus found at invalid level LL${level}`);
			cumulativeCatalog.coreBonuses[level][level / 3 - 1] =
				levelData.coreBonusId;
		}

		// load in active frame
		if (levelData.frameId)
			cumulativeCatalog.activeFrame[level] = levelData.frameId;

		// generate stats for this level
		if (cumulativeCatalog.activeFrame[level])
			calculateMechStats(cumulativeCatalog, level);
	}

	console.log(cumulativeCatalog);
}

export function resizeCatalog(newMaxLevel) {
	const currentMaxLevel = cumulativeCatalog.stats.length - 1;

	if (newMaxLevel > currentMaxLevel) {
		for (let level = currentMaxLevel + 1; level <= newMaxLevel; level++) {
			initializeCatalogLevel(level);
			if (cumulativeCatalog.activeFrame[level])
				calculateMechStats(cumulativeCatalog, level);
		}
	}
	else {
		const spliceTarget = newMaxLevel + 1;
		cumulativeCatalog.skillTriggers.splice(spliceTarget);
		cumulativeCatalog.talents.splice(spliceTarget);
		cumulativeCatalog.hase.splice(spliceTarget);
		cumulativeCatalog.licenses.splice(spliceTarget);
		cumulativeCatalog.activeFrame.splice(spliceTarget);
		cumulativeCatalog.coreBonuses.splice(spliceTarget);
		cumulativeCatalog.stats.splice(spliceTarget);
	}
}