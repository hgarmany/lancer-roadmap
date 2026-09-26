// data/normalizeLicenses.js

import {
	systemUpdate
} from "../ui/updates";

const excludeSources = [
	'GMS'
];

const TAG_ORDER = Object.freeze({
	'tg_unique': 0,
	'tg_ai': 1,
	'tg_limited': 2,
	'tg_exotic': 3
});

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

let licenses = null;

/**
 * Derive existence of licenses from
 * frame, system, and weapon requirements
 *
 * @param {Object} gameData
 * @returns {Array<{id: string, name: string}>}
 */
function getLicenses(gameData) {
	const licenses = new Map();

	for (const frame of gameData.frames) {
		const id = frame.license_id;
		if (id && !licenses.has(id) && !excludeSources.includes(frame.source)) {
			const licenseItems = [
				...gameData.systems,
				...gameData.mods,
				...gameData.weapons].filter(item =>
					item.license_id === id || item.license === frame?.name);

			const newLicense = {
				id,
				name: frame?.name,
				source: frame.source,
				ranks: Array.from({ length: 3 }, (_, idx) => licenseItems
					.filter(item => item.license_level - 1 === idx)
					.map(item => item.id)
				)
			};

			licenses.set(id, newLicense);
		}
	}

	return licenses;
}

/**
 * Accept both the usual collection arrays and single-item JSON files.
 * Invalid collection values are ignored.
 *
 * @param {unknown} collection
 * @returns {Array<Object>}
 */
export function normalizeCollection(collection) {
	if (Array.isArray(collection))
		return collection.filter(item => item && typeof item === 'object');
	if (collection && typeof collection === 'object')
		return [collection];
	return [];
}

/**
 * Build a map out of dataset entries, using the id value as a key.
 * Later entries intentionally replace earlier entries with the same ID.
 *
 * @param {any} dataset
 * @returns {Map}
 */
function normalizeById(dataset) {
	return new Map(normalizeCollection(dataset)
		.filter(item => typeof item.id === 'string' && item.id)
		.map(({ id, ...item }) => [id, item]));
}

/**
 * Comparator enforcing alphabetical name sort
 * 
 * @param {Object} a 
 * @param {Object} b 
 * @returns {boolean}
 */
function sortByName(a, b) {
	return a[1].name.toLowerCase() > b[1].name.toLowerCase();
}

/**
 * Comparator enforcing manufacturer order in MANUFACTURERS
 * 
 * @param {Object} a 
 * @param {Object} b 
 * @returns {boolean}
 */
function sortByManufacturerAndName(a, b) {
	if (a[1].source !== b[1].source)
		return MANUFACTURERS[a[1].source] > MANUFACTURERS[b[1].source];
	return sortByName(a, b);
}

/**
 * Comparator for frames
 * 
 * @param {Object} a 
 * @param {Object} b 
 * @returns {boolean}
 */
function sortFrames(a, b) {
	if (a[0] === 'mf_standard_pattern_i_everest')
		return -1;
	if (a[1].license_level != b[1].license_level)
		return a[1].license_level < b[1].license_level;
	return sortByManufacturerAndName(a, b);
}

/**
 * Comparator for systems or weapons
 * 
 * @param {Object} a 
 * @param {Object} b 
 * @returns {boolean}
 */
function sortEquipment(a, b) {
	// exotic gear comes after standard gear
	const exoticA = a[1].tags?.some(tag => tag.id === 'tg_exotic') ?? false;
	const exoticB = b[1].tags?.some(tag => tag.id === 'tg_exotic') ?? false;
	if (exoticA != exoticB)
		return exoticA;

	// standard equipment follows manufacturer order in MANUFACTURERS
	if ((a[1].source === 'GMS') != (b[1].source === 'GMS'))
		return a[1].source === 'GMS';
	if (a[1].source !== b[1].source)
		return MANUFACTURERS[a[1].source] > MANUFACTURERS[b[1].source];

	// sorted by license when within the same manufacturer
	if (a[1].license_id !== b[1].license_id) {
		const licenseA = licenses.get(a[1].license_id);
		const licenseB = licenses.get(b[1].license_id);
		if (!licenseA)
			return -1;
		if (!licenseB)
			return 1;
		return licenseA.name.toLowerCase() > licenseB.name.toLowerCase();
	}

	// for weapons: sorted by mount size when on the same license
	if (a[1].mount !== b[1].mount)
		return MOUNTS[a[1].mount] > MOUNTS[b[1].mount];

	return sortByName(a, b);
}

/**
 * Sort a list of tags such that major tags appear in a
 * consistent order after all other tags
 * 
 * @param {Array<Object>} tags 
 * @returns {number}
 */
function sortTags(tags) {
	return [...tags].sort((a, b) => {
		const priorityA = TAG_ORDER[a.id];
		const priorityB = TAG_ORDER[b.id];

		if (priorityA === undefined)
			return priorityB === undefined ? 0 : -1;
		if (priorityB === undefined)
			return 1;
		return priorityA - priorityB;
	});
}

function sortDataset(dataset, compare) {
	return new Map([...dataset.entries()].sort(compare));
}

/**
 * Some LCPs use non-standard license tagging
 * Normalize to the acceptable license id
 * 
 * @param {Map<string, Object>} dataset
 */
function cleanLicenseIds(dataset) {
	for (const [id, item] of dataset) {
		item.license_id ??= item.license;
		if (!item.license_id || !licenses.has(item.license_id)) {
			const licenseId = licenses.values()
				.find(license => license.name === item.license_id)?.id ?? null;
			if (licenseId)
				item.license_id = licenseId;
		}
	}
}

/**
 * Re-order all tags in a dataset's items or sub-items to a standard order
 * 
 * @param {Map<string, Object>} dataset 
 */
function sortEquipmentTags(dataset) {
	for (const item of dataset.values()) {
		if (item.tags)
			item.tags = sortTags(item.tags);

		if (item.profiles) {
			item.profiles = item.profiles.map(profile =>
				Array.isArray(profile.tags) ?
					{ ...profile, tags: sortTags(profile.tags) } : profile
			);
		}
	}
}

/**
 * Build source data maps out of core Lancer data and installed LCPs
 * 
 * @param {Object} data 
 * @returns {Object}
 */
export function getNormalizedData(data) {
	licenses = sortDataset(getLicenses(data), sortByManufacturerAndName);

	const weapons = normalizeById(data.weapons);
	sortEquipmentTags(weapons);
	cleanLicenseIds(weapons);

	const systems = normalizeById([
		...data.systems,
		...data.mods
	]);
	sortEquipmentTags(systems);
	cleanLicenseIds(systems);

	return {
		skillTriggers: normalizeById(data.skills),
		talents: sortDataset(normalizeById(data.talents), sortByName),
		licenses,
		frames: sortDataset(normalizeById(data.frames), sortFrames),
		coreBonuses: sortDataset(
			normalizeById(data.core_bonuses), sortByManufacturerAndName),
		weapons: sortDataset(weapons, sortEquipment),
		systems: sortDataset(systems, sortEquipment),
		mods: normalizeById(data.mods),
		tags: normalizeById(data.tags),
		rules: { ...data.rules[0] }
	};
}