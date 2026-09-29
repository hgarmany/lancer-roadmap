// ui/tags.js

import {
	srcData
} from '../data/loader.js';

import {
	roadmap
} from '../data/roadmap.js';

import {
	mountTagUpdate,
	weaponTagUpdate
} from './updates.js';

import {
	getEffectiveMounts,
	deepCopyMounts,
    isModEligible
} from '../rules/weapons.js';

import {
	ATTACHMENT_ID,
	getUnusedAttachments,
	moveAttachment
} from '../rules/attachments.js';

import {
	getItemNumUses,
	TAGS
} from '../rules/installsCommon.js';

import {
	TOUCH_DRAG_HOLD_DURATION,
	TOUCH_MOVE_TOLERANCE
} from '../constants.js';

const MAJOR_TAGS = [TAGS.UNIQUE, TAGS.AI, TAGS.LIMITED, TAGS.EXOTIC];

export const ATTACHMENT_TRANSFER_TYPE = 'application/x-lancer-attachment';

const touchDropTargets = new WeakMap();
let touchDrag = null;

function setAttachmentTransferData(event, attachmentData) {
	const serializedData = JSON.stringify(attachmentData);
	event.dataTransfer.effectAllowed = 'move';
	event.dataTransfer.setData(ATTACHMENT_TRANSFER_TYPE, serializedData);
	event.dataTransfer.setData('text/plain', serializedData);
}

function getAttachmentTransferData(event) {
	const serializedData =
		event.dataTransfer.getData(ATTACHMENT_TRANSFER_TYPE);
	if (!serializedData)
		return null;

	try {
		return JSON.parse(serializedData);
	}
	catch {
		return null;
	}
}

function isValidAttachmentTarget(level, attachmentData, target) {
	const isMount = target.classList.contains('mount');
	return attachmentData &&
		level === Number(attachmentData.level) &&
		(attachmentData.type === 'mount') === isMount &&
		(isMount || target.value &&
			target.classList.contains(attachmentData.type));
}

function dropTag(attachmentData, level, targetElement) {
	if (!isValidAttachmentTarget(level, attachmentData, targetElement))
		return;

	const isMount = targetElement.classList.contains('mount');

	const mounts = deepCopyMounts(level);
	const tgtMountIdx = Number(targetElement.dataset.mountIdx);
	const srcMountIdx = Number(attachmentData.mountIdx);

	let target = null;
	let source = null;

	// acquire source and target roadmap data
	if (isMount) {
		target = tgtMountIdx !== null ? mounts[tgtMountIdx] : null;
		source = srcMountIdx !== null ? mounts[srcMountIdx] : null;
	}
	else {
		const tgtSlotIdx = Number(targetElement.dataset.slotIdx) ?? null;
		target = tgtSlotIdx !== null ?
			mounts[tgtMountIdx]?.weapons[tgtSlotIdx] : null;
		if (!target.id)
			return;

		if (!isModEligible(attachmentData.id, target.id))
			return;

		const srcSlotIdx = Number(attachmentData.slotIdx) ?? null;
		source = srcSlotIdx !== null ?
			mounts[srcMountIdx]?.weapons[srcSlotIdx] : null;
	}
	
	// attempt move and, if successful, trigger visual refresh
	if (moveAttachment({ id: attachmentData.id, target, source })) {
		const update = isMount ? mountTagUpdate : weaponTagUpdate;
		const mountIdxs = [srcMountIdx, tgtMountIdx].filter(Number.isFinite);
		for (let i = level; i <= roadmap.maxLevel; i++)
			update(i, mountIdxs);
	}
}

function getTouch(event, identifier) {
	return [...event.touches, ...event.changedTouches]
		.find(touch => touch.identifier === identifier);
}

function getTouchDropTarget(x, y, attachmentData) {
	for (let element = document.elementFromPoint(x, y);
			element; element = element.parentElement) {
		const level = touchDropTargets.get(element);
		if (level !== undefined &&
			isValidAttachmentTarget(level, attachmentData, element))
			return { element, level };
	}

	return null;
}

function setTouchDropTarget(target) {
	if (touchDrag?.target?.element === target?.element)
		return;

	touchDrag?.target?.element.classList.remove('drag-focus');
	if (touchDrag)
		touchDrag.target = target;
	target?.element.classList.add('drag-focus');
}

function moveTouchPreview(touch) {
	if (!touchDrag?.preview)
		return;

	touchDrag.preview.style.left = `${touch.clientX}px`;
	touchDrag.preview.style.top = `${touch.clientY}px`;
}

function endTouchDrag() {
	clearTimeout(touchDrag?.timer);
	touchDrag?.target?.element.classList.remove('drag-focus');
	touchDrag?.preview?.remove();
	document.removeEventListener('touchmove', handleTouchMove);
	document.removeEventListener('touchend', handleTouchEnd);
	document.removeEventListener('touchcancel', handleTouchCancel);
	touchDrag = null;
}

function handleTouchMove(event) {
	const touch = touchDrag && getTouch(event, touchDrag.identifier);
	if (!touch)
		return;

	if (!touchDrag.active) {
		if (Math.hypot(
			touch.clientX - touchDrag.startX,
			touch.clientY - touchDrag.startY
		) > TOUCH_MOVE_TOLERANCE)
			endTouchDrag();
		return;
	}

	event.preventDefault();
	moveTouchPreview(touch);
	setTouchDropTarget(getTouchDropTarget(
		touch.clientX, touch.clientY, touchDrag.transfer));
}

function handleTouchEnd(event) {
	const touch = touchDrag && getTouch(event, touchDrag.identifier);
	if (!touch)
		return;

	if (touchDrag.active) {
		event.preventDefault();
		const target = getTouchDropTarget(
			touch.clientX, touch.clientY, touchDrag.transfer);

		if (target)
			dropTag(touchDrag.transfer, target.level, target.element);
	}

	endTouchDrag();
}

function handleTouchCancel(event) {
	if (touchDrag && getTouch(event, touchDrag.identifier))
		endTouchDrag();
}

function beginTouchDrag(event, attachmentData, tag) {
	if (event.touches.length !== 1 || event.target.closest('.clear'))
		return;

	endTouchDrag();
	const touch = event.touches[0];
	touchDrag = {
		identifier: touch.identifier,
		startX: touch.clientX,
		startY: touch.clientY,
		transfer: attachmentData,
		target: null,
		preview: null,
		active: false,
		timer: setTimeout(() => {
			if (!touchDrag)
				return;

			touchDrag.active = true;
			touchDrag.preview = tag.cloneNode(true);
			touchDrag.preview.querySelector('.clear')?.remove();
			touchDrag.preview.classList.add('touch-drag-preview');
			document.body.append(touchDrag.preview);
			moveTouchPreview(touch);
			setTouchDropTarget(getTouchDropTarget(
				touch.clientX, touch.clientY, attachmentData));
		}, TOUCH_DRAG_HOLD_DURATION)
	};

	document.addEventListener('touchmove', handleTouchMove, { passive: false });
	document.addEventListener('touchend', handleTouchEnd, { passive: false });
	document.addEventListener('touchcancel', handleTouchCancel);
}

function applyDragEventManagers(tag, attachmentData) {
	let nativeDragBlocked = false;
	tag.draggable = true;
	tag.addEventListener('pointerdown', event => {
		nativeDragBlocked = event.pointerType === 'mouse' &&
			event.target.closest('.clear');
	});
	tag.addEventListener('dragstart', event => {
		if (event.target.closest('.clear')) {
			event.preventDefault();
			return;
		}

		setAttachmentTransferData(event, attachmentData);
	});
	tag.addEventListener('touchstart', event => {
		beginTouchDrag(event, attachmentData, tag);
	}, { passive: true });
}

/**
 * Make an applied mod draggable and wire its removal button
 *
 * @param {number} level
 * @param {HTMLElement} tag
 * @param {HTMLButtonElement} removeButton
 * @param {number} mountIdx
 * @param {number} slotIdx
 * @param {string} modId
 */
function applyWeaponTagManager(
	level,
	tag,
	removeButton,
	mountIdx,
	slotIdx,
	id
) {
	applyDragEventManagers(tag,
		{ level, type: 'weapon', id, mountIdx, slotIdx });

	// remove mod from slot
	removeButton.addEventListener('click', event => {
		event.stopPropagation();
		const source = deepCopyMounts(level)?.[mountIdx].weapons[slotIdx];

		if (moveAttachment({ id, source }))
			for (let i = level; i < roadmap.maxLevel; i++)
				mountTagUpdate(i, [mountIdx]);
	});
}

/**
 * Assigns event listeners to a target so that it can receive
 * drag-and-drop tags
 * 
 * @param {number} level
 * @param {HTMLDivElement} target
 */
export function applyAttachmentManager(level, target) {
	touchDropTargets.set(target, level);

	target.addEventListener('dragover', event => {
		event.preventDefault();
		if (!event.dataTransfer.types.includes(ATTACHMENT_TRANSFER_TYPE))
			return;

		const transfer = getAttachmentTransferData(event);
		if (!target.value && !target.classList.contains('mount') ||
			!target.classList.contains(transfer.type))
			return;

		event.dataTransfer.dropEffect = 'move';
		target.classList.add('drag-focus');
	});

	target.addEventListener('dragleave', event => {
		if (!target.contains(event.relatedTarget))
			target.classList.remove('drag-focus');
	});

	target.addEventListener('drop', event => {
		if (!event.dataTransfer.types.includes(ATTACHMENT_TRANSFER_TYPE))
			return;

		target.classList.remove('drag-focus');
		const attachmentData = getAttachmentTransferData(event);

		if (!attachmentData ||
			!isValidAttachmentTarget(level, attachmentData, target))
			return;

		event.preventDefault();
		event.stopPropagation();
		dropTag(attachmentData, level, target);
	});
}

function renderAttachment(attachmentData) {
	const attachment = document.createElement('div');
	attachment.className = `tag ${attachmentData.type}-tag`;
	attachment.textContent = attachmentData.label;
	applyDragEventManagers(attachment, attachmentData);

	return attachment;
}

export function renderAttachmentsMenu(level) {
	const menu = document.createElement('div');
	menu.id = `attachments-ll-${level}`;
	menu.className = 'attachment-menu';

	const attachmentList = getUnusedAttachments(level);

	// omit menu when no options are available
	if (!attachmentList.length) {
		menu.style.display = 'none';
		return menu;
	}

	menu.style.display = 'flex';
	// populate tag menu
	for (const attachment of attachmentList)
		menu.append(renderAttachment(attachment));

	return menu;
}

function trySPTag(tags, item) {
	if (!item?.sp)
		return;

	const tag = document.createElement('div')
	tag.className = 'tag';
	tag.textContent = `${item.sp} SP`;
	tags.append(tag);
}

/**
 * Add all available and valid tags for a given piece of equipment
 * to the supplied tag container
 * 
 * @param {HTMLDivElement} tags 
 * @param {Object} item 
 * @param {boolean} onlyMajorTags 
 */
export function tryInnateTags(level, tags, item, onlyMajorTags = true) {
	for (const tag of item?.tags ?? []) {
		if (onlyMajorTags && !MAJOR_TAGS.includes(tag.id))
			continue;

		const tagPill = document.createElement('div');
		tagPill.className = `tag ${tag.id.replace('_', '-')}`;
		let text = srcData.tags.get(tag.id)?.name;

		const value = tag.id === TAGS.LIMITED ?
			getItemNumUses(level, item) : tag.val;
		tagPill.textContent = text.replace('{VAL}', value ?? '');
		tags.append(tagPill);
	}

	if (!onlyMajorTags)
		trySPTag(tags, item);
}

export function renderMountTags(level, attachments, mount) {
	const tags = document.createElement('div');
	tags.className = 'mount-tags';
	
	for (const attachment of attachments ?? []) {
		const tag = document.createElement('div');
		tag.className = 'tag mount-tag applied-tag';

		const label = document.createElement('span');
		label.textContent = attachment.label;
		tag.append(label);

		const mountIdx = Number(mount.dataset.mountIdx) ?? null;
		let source = getEffectiveMounts(level)?.[mountIdx];
		
		if (source.type !== 'Heavy' ||
			!attachments.some(item =>
				item.id === ATTACHMENT_ID.SUPERHEAVY_BRACING)) {

			applyDragEventManagers(tag, {
				level,
				type: 'mount',
				id: attachment.id,
				mountIdx: Number(mount.dataset.mountIdx)
			});
		
			const remove = document.createElement('button');
			remove.className = 'clear';
			remove.type = 'button';
			remove.title = `Remove ${attachment.label}`;

			remove.addEventListener('click', event => {
				event.stopPropagation();
				
				let didDeepCopy = false;
				if (!roadmap.ll[level].mounts) {
					didDeepCopy = true;
					const mounts = deepCopyMounts(level);
					source = mounts[mountIdx];
				}

				// attempt move and, if successful, trigger visual refresh
				if (moveAttachment({ id: attachment.id, source })) {
					for (let i = level; i <= roadmap.maxLevel; i++)
						mountTagUpdate(i, [mountIdx]);
				}
				else if (didDeepCopy)
					roadmap.ll[level].mounts = null;
			});

			tag.append(remove);
		}

		tags.append(tag);
	}

	tags.style.display = tags.children.length ? 'flex' : 'none';
	return tags;
}

export function renderWeaponTags(level, weapon, mountIdx, slotIdx, doAll) {
	const srcWeapon = srcData.weapons.get(weapon?.id);

	const tags = document.createElement('div');
	tags.className = 'tags';

	for (const attachment of weapon?.attachments ?? []) {
		// mod tag
		const dataElement = srcData.mods.get(attachment) ??
			srcData.coreBonuses.get(attachment);

		if (dataElement) {
			const tag = document.createElement('div');
			tag.className = 'tag mod-tag applied-tag';

			const label = document.createElement('span');
			label.textContent = dataElement.name;

			const remove = document.createElement('button');
			remove.className = 'clear';
			remove.type = 'button';
			remove.title = `Remove ${dataElement.name}`;

			tag.append(label, remove);
			applyWeaponTagManager(
				level, tag, remove, mountIdx, slotIdx, attachment);

			tags.append(tag);
		}
	}

	tryInnateTags(level, tags, srcWeapon, !doAll);

	tags.style.display = tags.children.length ? 'flex' : 'none';
	return tags;
}

export function renderSystemTags(level, systemId, doAll) {
	const system = srcData.systems.get(systemId);

	const tags = document.createElement('div');
	tags.className = 'tags';

	tryInnateTags(level, tags, system, !doAll);

	tags.style.display = tags.children.length ? 'flex' : 'none';
	return tags;
}

export function refreshTags(level, selectors) {
	for (const selector of selectors) {
		const currentTags = selector.querySelector('.tags');
		let updatedTags = null;

		if (selector.classList.contains('weapon') ||
			selector.classList.contains('custom-select-mimic')) {
			const mountIdx = Number(selector.dataset.mountIdx);
			const slotIdx = Number(selector.dataset.slotIdx);
			const weapon = getEffectiveMounts(level)[mountIdx]
				?.weapons[slotIdx];

			updatedTags = renderWeaponTags(
				level, weapon, mountIdx, slotIdx);
		}
		else if (selector.classList.contains('system')) {
			updatedTags = renderSystemTags(level, selector.value);
		}

		currentTags.replaceWith(updatedTags);
	}
}