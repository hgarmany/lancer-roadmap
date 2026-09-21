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
	deepCopyMounts
} from '../rules/weapons.js';

import {
	ATTACHMENT_ID,
	getUnusedAttachments,
	moveAttachment
} from '../rules/attachments.js';

import {
	TAGS,
	doesItemHaveTag,
	getItemNumUses
} from '../rules/installsCommon.js';

export const ATTACHMENT_TRANSFER_TYPE = 'application/x-lancer-attachment';

function setAttachmentTransferData(event, level, attachmentData) {
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
	tag.draggable = true;
	tag.addEventListener('dragstart', event => {
		if (event.target === removeButton) {
			event.preventDefault();
			return;
		}

		setAttachmentTransferData(event, level,
			{ level, type: 'weapon', id, mountIdx, slotIdx });
	});

	// remove mod from slot
	removeButton.addEventListener('click', event => {
		event.stopPropagation();
		const source = deepCopyMounts(level)?.[mountIdx].weapons[slotIdx];

		if (moveAttachment({ id, source }))
			mountTagUpdate(level, [mountIdx]);
	});
}

function dropTag(event, level, targetElement) {
	const isMount = targetElement.classList.contains('mount');
	const transfer = getAttachmentTransferData(event);
	
	// reject drops into different levels or the wrong target type
	if (!transfer ||
		level !== Number(transfer.level) ||
		(transfer.type === 'mount') != isMount)
		return;

	event.preventDefault();
	event.stopPropagation();
	
	const mounts = deepCopyMounts(level);
	const tgtMountIdx = Number(targetElement.dataset.mountIdx);
	const srcMountIdx = Number(transfer.mountIdx);

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

		const srcSlotIdx = Number(transfer.slotIdx) ?? null;
		source = srcSlotIdx !== null ?
			mounts[srcMountIdx]?.weapons[srcSlotIdx] : null;
	}
	
	// attempt move and, if successful, trigger visual refresh
	if (moveAttachment({ id: transfer.id, target, source })) {
		const update = isMount ? mountTagUpdate : weaponTagUpdate;
		const mountIdxs = [srcMountIdx, tgtMountIdx].filter(Number.isFinite);
		for (let i = level;
			i == level || i < roadmap.maxLevel && !roadmap.ll[i].mounts;
			i++)
			update(i, mountIdxs);
	}
}

/**
 * Assigns event listeners to a target so that it can receive
 * drag-and-drop tags
 * 
 * @param {number} level
 * @param {HTMLDivElement} target
 */
export function applyAttachmentManager(level, target) {
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
		dropTag(event, level, target);
	});
}

function renderAttachment(level, attachmentData) {
	const attachment = document.createElement('div');
	attachment.className = `tag ${attachmentData.type}-tag`;
	attachment.textContent = attachmentData.label;
	attachment.draggable = true;
	attachment.addEventListener('dragstart', event => {
		setAttachmentTransferData(event, level, attachmentData);
	});

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
		menu.append(renderAttachment(level, attachment));

	return menu;
}

function tryAITag(tags, item) {
	if (!doesItemHaveTag(item, TAGS.AI))
		return;

	const tag = document.createElement('div');
	tag.className = 'tag ai';
	tag.textContent = `AI`;
	tags.append(tag);
}

function tryExoticTag(tags, item) {
	if (!doesItemHaveTag(item, TAGS.EXOTIC))
		return;

	const tag = document.createElement('div');
	tag.className = 'tag exotic';
	tag.textContent = `Exotic`;
	tags.append(tag);
}

function tryLimitedTag(tags, item, level) {
	const limited = getItemNumUses(level, item);
	if (!limited)
		return;

	const tag = document.createElement('div');
	tag.className = 'tag limited';
	tag.textContent = `Limited ${limited}`;
	tags.append(tag);
}

function tryUniqueTag(tags, item, level) {
	if (!doesItemHaveTag(item, TAGS.UNIQUE))
		return;

	const tag = document.createElement('div');
	tag.className = 'tag unique';
	tag.textContent = 'Unique';
	tags.append(tag);
}

function trySPTag(tags, item) {
	if (!item?.sp)
		return;

	const tag = document.createElement('div')
	tag.className = 'tag';
	tag.textContent = `${item.sp} SP`;
	tags.append(tag);
}

export function renderMountTags(level, attachments, mount) {
	const tags = document.createElement('div');
	tags.className = 'mount-tags';
	
	for (const attachment of attachments ?? []) {
		const tag = document.createElement('div');
		tag.className = 'tag mount-tag applied-tag';
		tag.draggable = true;

		const label = document.createElement('span');
		label.textContent = attachment.label;
		tag.append(label);

		const mountIdx = Number(mount.dataset.mountIdx) ?? null;
		const source = deepCopyMounts(level)?.[mountIdx];
		
		if (source.type !== 'Heavy' ||
			!attachments.some(item =>
				item.id === ATTACHMENT_ID.SUPERHEAVY_BRACING)) {

			tag.addEventListener('dragstart', event => {
				setAttachmentTransferData(event, level,
					{
						level,
						type: 'mount',
						id: attachment.id,
						mountIdx: Number(mount.dataset.mountIdx)
					}
				);
			});
		
			const remove = document.createElement('button');
			remove.className = 'clear';
			remove.type = 'button';
			remove.title = `Remove ${attachment.label}`;

			remove.addEventListener('click', event => {
				event.stopPropagation();

				if (moveAttachment({ id: attachment.id, source }))
					mountTagUpdate(level, [mountIdx]);
			});

			tag.append(remove);
		}

		tags.append(tag);
	}

	tags.style.display = tags.children.length ? 'flex' : 'none';
	return tags;
}

export function renderWeaponTags(level, weapon, mountIdx, slotIdx, doSP) {
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

	tryAITag(tags, srcWeapon);
	tryExoticTag(tags, srcWeapon);
	tryLimitedTag(tags, srcWeapon, level);
	tryUniqueTag(tags, srcWeapon);
	if (doSP)
		trySPTag(tags, srcWeapon);

	tags.style.display = tags.children.length ? 'flex' : 'none';
	return tags;
}

export function renderSystemTags(level, systemId, doSP) {
	const system = srcData.systems.get(systemId);

	const tags = document.createElement('div');
	tags.className = 'tags';

	tryAITag(tags, system);
	tryExoticTag(tags, system);
	tryLimitedTag(tags, system, level);
	tryUniqueTag(tags, system);
	if (doSP)
		trySPTag(tags, system);

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