// ui/selectors/infoBubble.js

const infoBubble = document.getElementById('selector-info-bubble');

export const infoSources = new WeakMap();

const PRESS_HOLD_DURATION = 500; // delay to show on press-and-hold, ms
const MOVE_TOLERANCE = 10; // touchscreen wiggle margin on press-and-hold, px
const HIDE_COOLDOWN = 150; // delay to hide, ms

let infoBubbleHideTimer = null;
let currentAnchor = null;
let pressAndHold = null;
let suppressedClick = null;

function cancelInfoBubbleHide() {
	clearTimeout(infoBubbleHideTimer);
	infoBubbleHideTimer = null;
}

export function hideInfoBubble() {
	cancelInfoBubbleHide();
	infoBubble.hidden = true;
	currentAnchor = null;
}

function scheduleInfoBubbleHide() {
	clearTimeout(infoBubbleHideTimer);
	infoBubbleHideTimer = setTimeout(hideInfoBubble, HIDE_COOLDOWN);
}

/**
 * Parse valid info bubble triggers into the anchoring element,
 * its container region, and a getter for bubble content
 * 
 * @param {HTMLElement} target 
 * @returns {Object}
 */
function getInfoBubbleContext(target) {
	const option = target.closest?.('.selector-option');
	const menu = option?.closest('.selector-menu');
	const menuSource = infoSources.get(menu);
	if (option && menuSource) {
		return {
			anchor: option,
			region: menu,
			getContent: () => menuSource(option)
		};
	}

	const control = target.closest?.('.selector-control');
	const controlSource = infoSources.get(control);
	if (control && controlSource) {
		return {
			anchor: control,
			region: control,
			getContent: controlSource
		};
	}

	return null;
}

/**
 * Finds the best available space for rendering the info bubble
 * Prefers to render alongside the anchor, extending down,
 * on whichever side has more free width
 * Contingencies for insufficient vertical/horizontal space
 * 
 * @param {HTMLElement} anchor 
 * @returns 
 */
function positionInfoBubble(anchor) {
	const gap = 8;
	const margin = 8;
	const anchorRect = anchor.getBoundingClientRect();
	const avoidRect = anchor.closest('.selector-menu')
		?.getBoundingClientRect() ?? anchorRect;
	const bubbleRect = infoBubble.getBoundingClientRect();
	const right = avoidRect.right + gap;
	const left = avoidRect.left - bubbleRect.width - gap;
	let x;
	let y;

	const leftMargin = left - margin;
	const rightMargin = window.innerWidth - margin - bubbleRect.width - right;

	if (leftMargin > 0 || rightMargin > 0) {
		x = leftMargin > rightMargin ? left : right;
		y = Math.max(margin, Math.min(anchorRect.top,
			window.innerHeight - bubbleRect.height - margin));
	}
	else {
		// neither side fits: place the bubble outside the menu vertically
		x = Math.max(margin, Math.min(anchorRect.left,
			window.innerWidth - bubbleRect.width - margin));

		const below = window.innerHeight - margin - avoidRect.bottom - gap;
		const above = avoidRect.top - gap - margin;

		if (below >= bubbleRect.height)
			y = avoidRect.bottom + gap;
		else if (above >= bubbleRect.height)
			y = avoidRect.top - gap - bubbleRect.height;

		else {
			// still no suitable space: investigate resizing the bubble
			// below normal minimum constraints
			const placeBelow = below >= above;
			const available = Math.max(below, above);
			if (available < 50) {
				// no space suitable for any bubble: just hide it
				hideInfoBubble();
				return;
			}

			infoBubble.style.maxHeight = `${available}px`;
			y = placeBelow ? avoidRect.bottom + gap :
				avoidRect.top - gap - available;
		}
	}

	infoBubble.style.left = `${x}px`;
	infoBubble.style.top = `${y}px`;
}

function showInfoBubble({ anchor, getContent }) {
	cancelInfoBubbleHide();
	const content = getContent();
	const items = (Array.isArray(content) ? content : [content])
		.filter(item => item != null);
	if (!items.length)
		return false;

	infoBubble.replaceChildren(...items);
	infoBubble.hidden = false;
	currentAnchor = anchor;
	positionInfoBubble(anchor);

	return true;
}

function cancelPressAndHold() {
	if (pressAndHold)
		clearTimeout(pressAndHold.timer);
	pressAndHold = null;
}

// show info bubble when the mouse moves over an occupied selector or option
document.addEventListener('pointerover', event => {
	if (event.pointerType !== 'mouse')
		return;

	const request = getInfoBubbleContext(event.target);
	if (request && request.anchor !== currentAnchor)
		showInfoBubble(request);
});

// schedule removal of info bubble when
// the mouse leaves an occupied selector or option
document.addEventListener('pointerout', event => {
	if (event.pointerType !== 'mouse')
		return;

	const request = getInfoBubbleContext(event.target);
	if (!request ||
		request.region.contains(event.relatedTarget) ||
		infoBubble.contains(event.relatedTarget))
		return;

	scheduleInfoBubbleHide();
});

// for touchscreens: start a new press-and-hold event
// if on occupied selector or option
document.addEventListener('pointerdown', event => {
	if (event.pointerType === 'mouse' || !event.isPrimary)
		return;

	const request = getInfoBubbleContext(event.target);
	if (!request) {
		// kill invalid requests, kill any invalid + open info bubble
		if (!infoBubble.contains(event.target))
			hideInfoBubble();
		return;
	}

	cancelPressAndHold();

	// timer for press-and-hold to generate info bubble
	const timer = setTimeout(() => {
		pressAndHold = null;
		if (showInfoBubble(request)) {
			suppressedClick = {
				anchor: request.anchor,
				expires: performance.now() + 1000
			};
		}
	}, PRESS_HOLD_DURATION);

	// store new press-and-hold state
	pressAndHold = {
		pointerId: event.pointerId,
		request,
		x: event.clientX,
		y: event.clientY,
		timer
	};
}, { passive: true });

// for touchscreens: cancel a press-and-hold event if it becomes a drag
document.addEventListener('pointermove', event => {
	if (pressAndHold?.pointerId === event.pointerId && Math.hypot(
		event.clientX - pressAndHold.x,
		event.clientY - pressAndHold.y) > MOVE_TOLERANCE)
		cancelPressAndHold();
}, { passive: true });

// for touchscreens: cancel a press-and-hold event
for (const eventName of ['pointerup', 'pointercancel']) {
	document.addEventListener(eventName, event => {
		if (pressAndHold?.pointerId === event.pointerId)
			cancelPressAndHold();
	});
}

// for touchscreens: suppress default click generation on press-and-hold
document.addEventListener('click', event => {
	const targetAnchor = getInfoBubbleContext(event.target)?.anchor;
	if (performance.now() < suppressedClick?.expires &&
		targetAnchor === suppressedClick?.anchor) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}

	suppressedClick = null;
}, true);

// for touchscreens: suppress default press-and-hold behavior
document.addEventListener('contextmenu', event => {
	const targetAnchor = getInfoBubbleContext(event.target)?.anchor;
	if (targetAnchor && (targetAnchor === pressAndHold?.request.anchor ||
		targetAnchor === suppressedClick?.anchor))
		event.preventDefault();
});

// remove info bubble whenever the selector menu is scrolled through
document.addEventListener('scroll', event => {
	if (infoSources.has(event.target))
		hideInfoBubble();
}, true);

// remove info bubble whenever the whole window shifts
window.addEventListener('resize', hideInfoBubble);
window.addEventListener('scroll', hideInfoBubble);

// info bubble persists when the mouse is within it, disappears when it leaves
infoBubble.addEventListener('mouseenter', cancelInfoBubbleHide);
infoBubble.addEventListener('mouseleave', hideInfoBubble);