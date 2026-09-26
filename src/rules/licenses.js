// rules/licenses.js

import {
	srcData
} from '../data/loader.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

const licenses = cumulativeCatalog.licenses;

/**
 * Gets the appropriate display rank for the id'd license
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {boolean} selected 
 * @returns {number}
 */
export function getLicenseRank(level, id, selectedId = null) {
	const rank = licenses[level].get(id) ?? 0;
	return (id === selectedId) ? rank - 1 : rank;
}

/**
 * Determine whether the license with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {string} selectedId
 * @returns {boolean}
 */
export function isLicenseEligible(level, id, selectedId = null) {
	if (!id)
		return true;

	// licenses limited by total rank
	return getLicenseRank(level, id, selectedId) <
		srcData.licenses.get(id)?.ranks.length;
}