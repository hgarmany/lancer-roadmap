// render/roadmapTable.js

import {
	renderHexStat,
	renderHASETooltip,
	getFrameImageSrc,
	renderStats,
	renderMounts,
	renderIntegratedSystems,
	renderBudgetPill
} from './renderModules.js';

import {
	SELECT_TEMPLATE,
	renderSelector
} from './selectors/selectors.js';

import {
	renderAttachmentsMenu,
	renderSystemTags
} from './tags.js';

import {
	getEffectiveFrameId
} from '../rules/frames.js';

import {
	hasEligibleSystem
} from '../rules/systems.js';

import {
	roadmap
} from '../data/roadmap.js';

export function renderLevelLabel(level) {
	const label = document.createElement('div');
	label.id = `label-ll-${level}`;
	label.className = 'level-tab';
	label.dataset.ll = level;
	label.textContent = `LL${level}`;

	if (level != 0 && level % 3 == 0)
		label.classList.add('cb-level');

	return label;
}

function renderMenu(level, template) {
	const menu = document.createElement('div');
	menu.className = 'menu';

	if (template.title) {
		const menuLabel = document.createElement('div');
		menuLabel.className = 'menu-label';
		menuLabel.textContent = template.title + (level === 0 ? 's' : '');

		menu.append(menuLabel);
	}

	const roadmapData = template.readLevel(level);

	const selectGroup = document.createElement('div');
	selectGroup.id = `${template.type}-ll-${level}`;
	selectGroup.className = 'select-group';

	const isSystemMenu = template === SELECT_TEMPLATE.SYSTEM;
	const items = roadmapData instanceof Array ? roadmapData :
		(isSystemMenu && roadmapData == null ? [] : [roadmapData]);

	// configure selectors for current user-selected values
	items.forEach((item, idx) => {
		const id = isSystemMenu ? item?.id ?? item : item;
		const selector = renderSelector(level, id, template);
		selector.dataset.idx = idx;
		if (isSystemMenu)
			selector.append(renderSystemTags(level, id));

		selectGroup.append(selector);
	});

	// system cell uses dynamic list: check for rendering empty selector
	if (isSystemMenu && hasEligibleSystem(level)) {
		const selector = renderSelector(level, null, template);
		selector.dataset.idx = items.length;
		selector.append(renderSystemTags(level, null));
		selectGroup.append(selector);
	}

	menu.append(selectGroup);

	return menu;
}

function renderHASEGroup(level) {
	const menu = document.createElement('div');
	menu.className = 'menu';

	const menuLabel = document.createElement('div');
	menuLabel.className = 'menu-label';
	menuLabel.textContent = 'HASE';

	const haseGroup = document.createElement('div');
	haseGroup.id = `hase-ll-${level}`;
	haseGroup.className = 'hase-group';

	const hullHex = renderHexStat(level, 'hull');
	const agilityHex = renderHexStat(level, 'agility');
	const systemsHex = renderHexStat(level, 'systems');
	const engineeringHex = renderHexStat(level, 'engineering');

	const haseTooltip = renderHASETooltip(level);

	haseGroup.append(
		hullHex,
		agilityHex,
		systemsHex,
		engineeringHex,
		haseTooltip
	);

	menu.append(menuLabel, haseGroup)



	return menu;
}

function appendIfPresent(parent, ...children) {
	parent.append(...children.filter(child => child != null));
}

function renderLevelUp(level) {
	const leftColumn = document.createElement('div');
	leftColumn.className = 'level-up-col';

	const rightColumn = document.createElement('div');
	rightColumn.className = 'level-up-col';

	if (level === 0) {
		appendIfPresent(
			leftColumn,
			renderMenu(level, SELECT_TEMPLATE.SKILL_TRIGGER)
		);
		appendIfPresent(
			rightColumn,
			renderMenu(level, SELECT_TEMPLATE.TALENT),
			renderHASEGroup(level)
		);
	}
	else {
		appendIfPresent(
			leftColumn,
			renderMenu(level, SELECT_TEMPLATE.SKILL_TRIGGER),
			renderMenu(level, SELECT_TEMPLATE.TALENT),
			renderMenu(level, SELECT_TEMPLATE.LICENSE)
		);
		if (level !== 0 && level % 3 === 0) {
			appendIfPresent(
				leftColumn,
				renderMenu(level, SELECT_TEMPLATE.CORE_BONUS)
			);
		}
		appendIfPresent(
			rightColumn,
			renderHASEGroup(level)
		);
	}

	return [leftColumn, rightColumn];
}

function renderFrame(level) {
	const activeFrameId = getEffectiveFrameId(level);

	// load icon image from third party database
	const icon = document.createElement('img');
	icon.id = `${SELECT_TEMPLATE.FRAME.type}-ll-${level}-icon`;
	icon.src = getFrameImageSrc(activeFrameId) ?? '';
	icon.referrerPolicy = 'no-referrer';

	const menu = renderMenu(level, SELECT_TEMPLATE.FRAME);

	return [icon, menu];
}

function renderMountsCell(level) {
	return [
		renderAttachmentsMenu(level),
		renderMounts(level)
	];
}

function renderSystemsCell(level) {
	return [
		renderBudgetPill(level),
		renderIntegratedSystems(level),
		renderMenu(level, SELECT_TEMPLATE.SYSTEM)
	];
}

const CELL = {
	LEVELUP: {
		name: 'level-up',
		render: renderLevelUp
	},
	FRAME: {
		name: 'frame',
		render: renderFrame
	},
	STATS: {
		name: 'stats',
		render: renderStats
	},
	MOUNTS: {
		name: 'mounts',
		render: renderMountsCell
	},
	SYSTEMS: {
		name: 'systems',
		render: renderSystemsCell
	}
}

function renderCellType(cellType, level) {
	const cell = document.createElement('td');
	cell.className = `${cellType.name}-cell`;
	if ((cellType === CELL.MOUNTS && roadmap.ll[level].mounts == null) ||
		(cellType === CELL.SYSTEMS && !roadmap.ll[level].systems?.length))
		cell.classList.add('inherited');

	const cellContent = document.createElement('div');
	cellContent.className = `cell-content ${cellType.name}`;
	cellContent.dataset.ll = level;

	cellContent.append(...cellType.render(level));
	cell.append(cellContent);

	return cell;
}

export function renderLevelRow(level) {
	const row = document.createElement('tr');
	row.id = `row-ll-${level}`;

	row.append(
		renderCellType(CELL.LEVELUP, level),
		renderCellType(CELL.FRAME, level),
		renderCellType(CELL.STATS, level),
		renderCellType(CELL.SYSTEMS, level),
		renderCellType(CELL.MOUNTS, level)
	);

	return row;
}