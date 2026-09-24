// rules/hase.js

import {
	srcData
} from '../data/loader.js';

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog,
	incrementFromLevel,
	decrementFromLevel
} from '../data/cumulativeCatalog.js';

const haseCatalog = cumulativeCatalog.hase;

/**
 * Allow another HASE selection where
 * (1) a level has unallocated points, and
 * (2) the skill has not reached the rank cap
 * 
 * @param {number} level 
 * @param {string} id 
 * @returns {boolean}
 */
export function allowIncreaseHASE(level, id) {
	const haseIds = roadmap.ll[level].haseIds;
	const skill = haseCatalog[level].get(id) ?? 0;
	return skill < srcData.rules.max_hase &&
		(!haseIds[0] || level === 0 && !haseIds[1]);
}

/**
 * Allow removing a HASE selection if this level
 * has invested a point in the id'd skill
 * 
 * @param {number} level 
 * @param {string} id 
 * @returns {boolean}
 */
export function allowDecreaseHASE(level, id) {
	const haseIds = roadmap.ll[level].haseIds;
	return haseIds[0] == id || level === 0 && haseIds[1] == id;
}

/**
 * Get the number of mech skill points used for HASE on this level
 * 
 * @param {number} level
 * @returns {number}
 */
export function countUsedHASEPoints(level) {
	const haseIds = roadmap.ll[level].haseIds;

	if (level !== 0)
		return haseIds[0] !== null | 0;

	return (haseIds[0] !== null | 0) + (haseIds[1] !== null | 0);
}

/**
 * Sets HASE on both roadmap and cumulative catalog
 * HASE array does not correspond to selector list
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {number} modifier 
 */
export function updateHASELog(level, id, doIncrement) {
	// roadmap update
	const haseIds = roadmap.ll[level].haseIds;
	if (level === 0) {
		if (doIncrement) {
			if (haseIds[0])
				haseIds[1] = id;
			else
				haseIds[0] = id;
		}
		else {
			if (haseIds[1] == id)
				haseIds[1] = null;
			else
				haseIds[0] = null;
		}
	}
	else {
		haseIds[0] = doIncrement ? id : null;
	}

	// cumulative catalog update
	if (doIncrement)
		incrementFromLevel(haseCatalog, id, level);
	else
		decrementFromLevel(haseCatalog, id, level);
}