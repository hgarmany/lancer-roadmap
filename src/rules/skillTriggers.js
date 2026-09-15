// rules/skillTriggers.js

import {
	MAX_SKILL_RANK
} from '../constants.js';

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

const skillTriggers = cumulativeCatalog.skillTriggers;

/**
 * Gets the appropriate display rank for the id'd skill trigger
 * 
 * @param {number} level
 * @param {string} id
 * @param {string} selectedId
 * @returns {number}
 */
export function getSkillTriggerRank(level, id, selectedId = null) {
	const rank = skillTriggers[level].get(id) ?? 0;
	return (id === selectedId) ? rank - 1 : rank;
}

/**
 * Determine whether the skill with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {string} selectedId
 * @returns {boolean}
 */
export function isSkillTriggerEligible(level, id, selectedId = null) {
	if (!id)
		return true;

	// all ll0 skills must be different
	if (level === 0)
		return (id === selectedId && skillTriggers[0].get(id) === 1) ||
			!roadmap.ll[0].skillTriggerIds.includes(id);
	// skills limited by total rank
	else
		return (skillTriggers[level].get(id) ?? 0) <
			((id === selectedId) ? MAX_SKILL_RANK + 1 : MAX_SKILL_RANK);
}