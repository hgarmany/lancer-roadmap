// main.js

import {
	loadSourceData,
	configureLcpManager
} from './data/loader.js';

import {
	createDefaultRoadmap
} from './data/roadmap.js';

import {
	initializeCatalog
} from './data/cumulativeCatalog.js';

import {
	configureHeader,
	configureToolMenu,
	initializeRenderPipeline
} from './ui/renderer.js';

import {
	configureModal
} from './ui/modal/modal.js';

configureHeader();

loadSourceData();
createDefaultRoadmap();

// initialize roadmap planner
configureToolMenu();
configureModal();
initializeCatalog();
initializeRenderPipeline();
configureLcpManager();

await document.fonts.ready;

document.documentElement.classList.remove('app-loading');
document.documentElement.classList.add('app-ready');