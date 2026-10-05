// rules/systems.js

import {
	roadmap,
	getEffectiveSystems
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

import {
	TAGS,
	doesItemHaveTag,
	isFrameIntegratedItem
} from './installsCommon.js';

const talents = cumulativeCatalog.talents;
const licenses = cumulativeCatalog.licenses;
const activeFrame = cumulativeCatalog.activeFrame;
const stats = cumulativeCatalog.stats;

/**
 * Get the bonus a system adds to the AI cap
 * Defaults to 0 for non-bonus systems
 * 
 * @param {string} id
 * @returns {number}
 */
function systemAIBonus(id) {
	const bonus = Number(srcData.systems.get(id)?.bonuses
		?.find(bonus => bonus.id === 'ai_cap')?.val);
	return Number.isFinite(bonus) ? bonus : 0;
}

/**
 * Determine whether the system with the given id
 * is a valid choice at this level
 * 
 * @param {number} level
 * @param {string} id
 * @param {string} selectedId
 * @returns {boolean}
 */
export function isSystemEligible(level, id, selectedId = null) {
	if (!id)
		return true;
	const candidate = srcData.systems.get(id);
	
	// reject invalid systems, unpermitted exotics, integrated systems
	if (!candidate ||
		!roadmap.allowExotics && doesItemHaveTag(candidate, TAGS.EXOTIC) ||
		isFrameIntegratedItem(id))
		return false;
		
	const selectedSystem = selectedId ? srcData.systems.get(selectedId) : null;

	// determine whether adding/swapping systems is within the level's budget
	const withinSPBudget =
		Number(candidate.sp ?? 0) - Number(selectedSystem?.sp ?? 0) <=
		stats[level].sp_budget;
	
	if (!withinSPBudget)
		return false;

	// AI systems need a free AI slot
	if (doesItemHaveTag(candidate, TAGS.AI) &&
		stats[level].ai_budget +
			(doesItemHaveTag(selectedSystem, TAGS.AI) | 0) + 
			systemAIBonus(id) -
			systemAIBonus(selectedId) <= 0)
		return false;

	// check for uniques, reject unique systems already installed
	const installedSystems = getEffectiveSystems(level);
	if (doesItemHaveTag(candidate, TAGS.UNIQUE) &&
		id != selectedId &&
		installedSystems
			.find(system => system?.id === id) !== undefined)
		return false;

	// talent-issued systems must match rank exactly and not be integrated
	if (candidate.talent_item) {
		const rank = talents[level].get(candidate.talent_id) ?? 0;
		const talentData = srcData.talents.get(candidate.talent_id);
		if (!talentData)
			return false;
		const rankData = talentData.ranks[candidate.talent_rank - 1];
		if (rankData.integrated?.includes(id) ||
			rankData.exclusive ? rank != candidate.talent_rank :
				rank < candidate.talent_rank)
			return false;

		return true;
	}

	// gms systems are always eligible
	if (!candidate.license_id || candidate.license_id === 'GMS')
		return true;

	// allow systems at or below the level's license rank
	return candidate.license_level <=
		licenses[level].get(candidate.license_id);
}

/**
 * Get whether a level can take any more systems
 * 
 * @param {number} level
 * @returns {boolean}
 */
export function hasEligibleSystem(level) {
	for (const systemId of srcData.systems.keys()) {
		if (isSystemEligible(level, systemId, null))
			return true;
	}

	return false;
}

export function getIntegratedSystemIds(level) {
	const frame = srcData.frames.get(activeFrame[level]);
	const integratedIds = [
		...frame?.core_system?.integrated ?? []
	];

	for (const [talentId, rankVal] of talents[level].entries()) {
		const rankData = srcData.talents.get(talentId)?.ranks;
		if (!rankData)
			continue;
		const startRank = Math.min(rankVal - 1, rankData.length);
		for (let rank = startRank; rank >= 0; rank--) {
			const systemIds = rankData[rank].integrated;
			if (systemIds) {
				integratedIds.push(...systemIds);
				break;
			}
		}
	}

	return integratedIds;
}

export function configureSystems(level) {
	roadmap.ll[level].systems = [...getEffectiveSystems(level)];

	return roadmap.ll[level].systems;
}