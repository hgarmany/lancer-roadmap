// ui/roadmapCarousel.js

import {
    renderLevelLabel
} from './renderModules.js';

import {
    renderCellType,
    CELL
} from './roadmapTable.js';

export function renderLevelCarouselCard(level) {
    const card = document.createElement('div');
    card.className = 'carousel-card';

    card.append(renderLevelLabel(level));

    const cardBody = document.createElement('div');
    cardBody.className = 'carousel-card-body';
    
    cardBody.append(
        renderCellType(CELL.LEVELUP, level),
        renderCellType(CELL.FRAME, level),
        renderCellType(CELL.STATS, level),
        renderCellType(CELL.SYSTEMS, level),
        renderCellType(CELL.MOUNTS, level)
    );

    card.append(cardBody);

    return card;
}