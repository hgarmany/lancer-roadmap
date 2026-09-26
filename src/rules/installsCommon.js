// rules/installsCommon.js

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

const stats = cumulativeCatalog.stats;

export const TAGS = Object.freeze({
	EXOTIC: 'tg_exotic',
	UNIQUE: 'tg_unique',
	AI: 'tg_ai',
	LIMITED: 'tg_limited'
});

/**
 * Get whether an item has a given tag
 * 
 * @param {Object} item
 * @param {string} tag
 * @returns {boolean}
 */
export function doesItemHaveTag(item, tagId) {
	return item?.tags?.some(tag => tag.id === tagId) ?? false;
}

/**
 * Get the number of uses a limited item has
 * Non-limited items return null
 * 
 * @param {number} level
 * @param {Object} item
 * @returns {string}
 */
export function getItemNumUses(level, item) {
	const limited = item?.tags?.find(tag => tag.id === TAGS.LIMITED);

	if (!limited)
		return null;

	const bonus = stats[level].limited_bonus;

	if (Number(limited.val))
		return Number(limited.val) + bonus;

	const plusSuffixIdx = limited.val.indexOf('+') + 1;
	if (plusSuffixIdx > 0)
		return limited.val.substring(0, plusSuffixIdx) +
			(Number(limited.val.substring(plusSuffixIdx)) + bonus);
	return `${limited.val}${bonus ? ('+' + bonus) : ''}`;
}

/**
 * Get whether an item appears as an integrated element of a frame
 * 
 * @param {string} id
 * @returns {boolean}
 */
export function isFrameIntegratedItem(id) {
	for (const frame of srcData.frames.values()) {
		if (frame.core_system?.integrated?.includes(id))
			return true;
	}

	return false;
}