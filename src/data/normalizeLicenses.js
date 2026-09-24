// data/normalizeLicenses.js

import { systemUpdate } from "../ui/updates";
import { srcData } from "./loader";

const excludeSources = [
	'GMS'
];

/**
 * Derive existence of licenses from
 * frame, system, and weapon requirements
 *
 * @param {Object} gameData
 * @returns {Array<{id: string, name: string}>}
 */
export function getLicenses(gameData) {
	const licenses = new Map();

	for (const frame of gameData.frames) {
		const id = frame.license_id;
		if (!licenses.get(id) && !excludeSources.includes(frame.source)) {
			const licenseItems = [
				...gameData.systems,
				...gameData.mods,
				...gameData.weapons].filter(item =>
					item.license_id === id || item.license === frame?.name);

			const newLicense = {
				id,
				name: frame?.name,
				source: frame.source,
				items: Array.from({ length: 3 }, (_, idx) => licenseItems
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
 * Generalized getter for obtaining
 * license information from any single feature
 * 
 * @param {Object} item
 * @returns {String}
 */
function getLicenseName(item) {
	if (typeof item?.license === "string")
		return item.license.trim();
	if (typeof item?.license?.name === "string")
		return item.license.name.trim();

	return null;
}

/**
 * Normalize character set
 * 
 * @param {String} value
 * @returns {String}
 */
function slugify(value) {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/['’‘]/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}
