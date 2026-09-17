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

loadSourceData();
createDefaultRoadmap();

// initialize roadmap planner
configureHeader();
configureToolMenu();
configureModal();
initializeCatalog();
initializeRenderPipeline();
configureLcpManager();