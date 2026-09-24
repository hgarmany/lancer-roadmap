// rules/talents.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';
import { srcData } from '../data/loader.js';

const talents = cumulativeCatalog.talents;

/**
 * Gets the appropriate display rank for the id'd talent
 * 
 * @param {number} level
 * @param {string} id
 * @param {string} selectedId
 * @returns {number}
 */
export function getTalentRank(level, id, selectedId = null) {
	const rank = talents[level].get(id) ?? 0;
	return (id === selectedId) ? rank - 1 : rank;
}

/**
 * Determine whether the talent with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {string} selectedId
 * @returns {boolean}
 */
export function isTalentEligible(level, id, selectedId = null) {
	if (!id)
		return true;

	// all ll0 talents must be different
	if (level === 0)
		return (id === selectedId && talents[0].get(id) === 1) ||
			!roadmap.ll[0].talentIds.includes(id);
	// talents limited by total rank
	else
		return getTalentRank(level, id, selectedId) <
			srcData.talents.get(id)?.ranks.length;
}