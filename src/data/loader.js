import lancerData from '@massif/lancer-data';
import {
	strFromU8,
	unzipSync
} from 'fflate';

import {
	getLicenses
} from './normalizeLicenses.js';

import {
	cleanRoadmapAfterLcpRemove
} from './roadmap.js';

import {
	initializeCatalog
} from '../data/cumulativeCatalog.js';

import {
	rerenderRoadmap
} from '../ui/renderer.js';

import {
	fileInput,
	lcpManager,
	lcpStatus
} from '../ui/renderer.js';

import {
	renderPackageList
} from '../ui/renderModules.js';

const LCP_STORAGE_KEY = 'lancer-roadmap-lcp-packages';
const MAX_LCP_BYTES = 50 * 1024 * 1024;
const MAX_LCP_FILE_COUNT = 20;
const MAX_LCP_ITEM_COUNT = 200;

const TAG_ORDER = Object.freeze({
	'tg_unique': 0,
	'tg_ai': 1,
	'tg_limited': 2,
	'tg_exotic': 3
});

const LCP_COLLECTIONS = Object.freeze([
	'skills',
	'talents',
	'core_bonuses',
	'frames',
	'weapons',
	'systems',
	'mods',
	'tags',
	'rules'
]);

export const srcData = {};

/**
 * Accept both the usual collection arrays and single-item JSON files.
 * Invalid collection values are ignored.
 *
 * @param {unknown} collection
 * @returns {Array<Object>}
 */
function normalizeCollection(collection) {
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
 * Some LCPs use non-standard license tagging
 * Normalize to the acceptable license id
 * 
 * @param {Map<string, Object>} dataset
 */
function cleanLicenseIds(dataset) {
	for (const [id, item] of dataset) {
		item.license_id ??= item.license;
		if (!item.license_id || !srcData.licenses.has(item.license_id)) {
			const licenseId = srcData.licenses.values()
				.find(license => license.name === item.license_id)?.id ?? null;
			if (licenseId)
				item.license_id = licenseId;
		}
	}
}

export function getStoredPackages() {
	try {
		const stored = JSON.parse(localStorage.getItem(LCP_STORAGE_KEY) ?? '[]');
		return Array.isArray(stored) ? stored : [];
	}
	catch (error) {
		console.warn('Unable to read installed LCP data.', error);
		return [];
	}
}

export function setStoredPackages(packages) {
	localStorage.setItem(LCP_STORAGE_KEY, JSON.stringify(packages));
}

function getPackageId(manifest, fileName) {
	const identity = manifest.item_prefix ?? manifest.name ?? fileName;
	return String(identity)
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Performs several archive-level checks on an LCP
 * If all pass, proceed to extract compressed data
 *
 * @param {Uint8Array} bytes
 * @param {string} fileName
 * @returns {Object<string, Uint8Array>}
 */
function safeLcpUnzip(bytes, fileName) {
	let fileCount = 0;
	let expandedBytes = 0;
	let rejectionMessage = '';

	let archive;
	try {
		archive = unzipSync(bytes, {
			filter: file => {
				if (rejectionMessage)
					return false;

				const path = file.name.replaceAll('\\', '/');
				const isDirectory = path.endsWith('/');
				if (isDirectory)
					return false;

				fileCount++;
				if (fileCount > MAX_LCP_FILE_COUNT) {
					rejectionMessage = `${fileName} contains too many files.`;
					return false;
				}

				if (!path.toLowerCase().endsWith('.json')) {
					rejectionMessage = `${fileName} contains a non-JSON file: ${file.name}`;
					return false;
				}

				if (!Number.isSafeInteger(file.originalSize) || file.originalSize < 0) {
					rejectionMessage = `${fileName} contains a file with an invalid size.`;
					return false;
				}

				expandedBytes += file.originalSize;
				if (expandedBytes > MAX_LCP_BYTES) {
					rejectionMessage = `${fileName} expands beyond the 50 MB safety limit.`;
					return false;
				}

				return true;
			}
		});
	}
	catch {
		throw new Error('The selected file is not a readable LCP/ZIP archive.');
	}

	if (rejectionMessage)
		throw new Error(rejectionMessage);

	const actualExpandedBytes = Object.values(archive)
		.reduce((total, contents) => total + contents.byteLength, 0);
	if (actualExpandedBytes > MAX_LCP_BYTES)
		throw new Error(`${fileName} expands beyond the 50 MB safety limit.`);

	return archive;
}

/**
 * Read the supported source data from an LCP archive
 *
 * @param {Uint8Array} bytes
 * @param {string} fileName
 * @returns {Object}
 */
export function parseLcpArchive(bytes, fileName = 'package.lcp') {
	if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0)
		throw new Error('The selected file is empty.');
	if (bytes.byteLength > MAX_LCP_BYTES)
		throw new Error('The selected LCP is larger than 50 MB.');

	const archive = safeLcpUnzip(bytes, fileName);

	const jsonFiles = new Map();
	for (const [path, contents] of Object.entries(archive))
		jsonFiles.set(
			path.replaceAll('\\', '/').split('/').pop().toLowerCase(),
			contents
		);

	const manifestFile = jsonFiles.get('lcp_manifest.json');
	if (!manifestFile)
		throw new Error('This archive does not contain lcp_manifest.json.');

	let manifest;
	try {
		manifest = JSON.parse(strFromU8(manifestFile).replace(/^\uFEFF/, ''));
	}
	catch {
		throw new Error('The LCP manifest is not valid JSON.');
	}

	if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
		throw new Error('The LCP manifest has an invalid format.');

	// import data to collection bins
	const collections = {};
	let itemCount = 0;
	for (const collectionName of LCP_COLLECTIONS) {
		const collectionFile = jsonFiles.get(`${collectionName}.json`);
		if (!collectionFile) {
			collections[collectionName] = [];
			continue;
		}

		let parsed;
		try {
			parsed = JSON.parse(
				strFromU8(collectionFile).replace(/^\uFEFF/, ''));
		}
		catch {
			throw new Error(`${collectionName}.json is not valid JSON.`);
		}

		collections[collectionName] = normalizeCollection(parsed)
			.filter(item => typeof item.id === 'string' && item.id);
		itemCount += collections[collectionName].length;
		if (itemCount > MAX_LCP_ITEM_COUNT)
			throw new Error(`${fileName} exceeds the import limit on new items.`);
	}

	if (itemCount === 0)
		throw new Error('The LCP contains no supported roadmap data.');

	return {
		id: getPackageId(manifest, fileName),
		name: manifest.name ?? fileName,
		version: manifest.version ?? '',
		author: manifest.author ?? '',
		description: manifest.description ?? '',
		fileName,
		collections
	};
}

/**
 * Compile data from all available JSON
 * 
 * @returns {Object}
 */
function getMergedData() {
	const mergedData = {};
	for (const collectionName of LCP_COLLECTIONS)
		mergedData[collectionName] = [
			...normalizeCollection(lancerData[collectionName])
		];

	for (const lcp of getStoredPackages()) {
		for (const collectionName of LCP_COLLECTIONS) {
			mergedData[collectionName].push(
				...normalizeCollection(lcp.collections?.[collectionName]));
		}
	}

	return mergedData;
}

/**
 * Build source data maps out of core Lancer data and installed LCPs
 */
export function loadSourceData() {
	const mergedData = getMergedData();

	srcData.skillTriggers = normalizeById(mergedData.skills);
	srcData.talents = normalizeById(mergedData.talents);
	srcData.licenses = getLicenses(mergedData);
	srcData.frames = normalizeById(mergedData.frames);
	srcData.coreBonuses = normalizeById(mergedData.core_bonuses);
	srcData.weapons = normalizeById(mergedData.weapons);
	srcData.systems = normalizeById([
		...mergedData.systems,
		...mergedData.mods
	]);
	sortEquipmentTags(srcData.weapons);
	sortEquipmentTags(srcData.systems);

	cleanLicenseIds(srcData.weapons);
	cleanLicenseIds(srcData.systems);

	srcData.mods = normalizeById(mergedData.mods);
	srcData.tags = normalizeById(mergedData.tags);
	srcData.rules = { ...mergedData.rules[0] };

	console.log(srcData);
}

function pushLcpChange(lcp, isImport) {
	const packages = getStoredPackages();
	const idx = packages.findIndex(
		candidate => candidate.id === lcp.id);

	if (isImport) {
		if (idx < 0)
			packages.push(lcp);
		else
			packages.splice(idx, 1, lcp);
	}
	else {
		packages.splice(idx, 1);
	}

	setStoredPackages(packages);
	loadSourceData();
	if (!isImport)
		cleanRoadmapAfterLcpRemove(srcData);
	renderPackageList(packages, isImport, lcp);

	initializeCatalog();
	rerenderRoadmap();
}

/**
 * Process selected LCP file into source data
 *
 * @param {File} file
 * @param {Function} onDataChanged
 */
async function importLCP(file) {
	lcpStatus.textContent = `Installing ${file.name}…`;
	try {
		const lcp = parseLcpArchive(
			new Uint8Array(await file.arrayBuffer()), file.name);
		pushLcpChange(lcp, true);
	}
	catch (error) {
		console.error(error);
		lcpStatus.textContent = error instanceof Error ?
			error.message : 'Unable to install this LCP.';
	}
	finally {
		fileInput.value = '';
	}
}

export function removeLCP(lcp) {
	pushLcpChange(lcp, false);
}

export function configureLcpManager() {
	renderPackageList(getStoredPackages());

	document.addEventListener('pointerdown', event => {
		if (!lcpManager.contains(event.target))
			lcpManager.open = false;
	});

	document.addEventListener('keydown', event => {
		if (event.key === 'Escape')
			lcpManager.open = false;
	});

	fileInput.addEventListener('change', async () => {
		const file = fileInput.files?.[0];
		if (!file)
			return;
		await importLCP(file);
	});
}