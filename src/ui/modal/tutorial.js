import {
	srcData
} from '../../data/loader.js';

import {
	renderDummySelectors,
	SELECT_TEMPLATE
} from '../selectors/selectors.js';

import {
	MOUNT_SLOTS
} from '../../rules/weapons.js';

import {
	createDummyAttachmentManager
} from '../tags.js';

const TUTORIAL_MOD_TRANSFER_TYPE = 'application/x-lancer-tutorial-mod';
const EXAMPLE_MOD_ID = 'example-mod';
const exampleMount = MOUNT_SLOTS['Main/Aux'];

function isExampleSystemAvailable(id, licenseId) {
	if (!id)
		return true;

	const item = srcData.systems.get(id);
	return item.source === 'GMS' ||
		item.license_id === licenseId && Number(item.license_level) === 1;
}

function isExampleWeaponAvailable(slotIdx, id, licenseId) {
	if (!id)
		return true;

	const item = srcData.weapons.get(id);
	if (!exampleMount[slotIdx].allowedWeaponMounts.includes(item.mount))
		return false;
	return item.source === 'GMS' ||
		item.license_id === licenseId && Number(item.license_level) === 1;
}

const tutorialContent = `
	<p>
		I believe that Lancer character building is best served not just by
		constructing your favorite build for a given license level, but by
		getting to that build along a path that is equally fun. You should feel
		confident that you'll get the most out of your mech on every mission,
		not just at LL6 or whatever level your build targets. Lancer Roadmap
		helps you to plan out the best version of a build from LL0 to LL12 and
		everywhere in between. You can think of this as a souped-up spreadsheet
		that budgets out everything you can afford at any given level, so that
		you know exactly when synergies and build-defining features will come
		online for you.
	</p>
	<section class="modal-text-box">
		<h2>Basics</h2>
		<p>
			Lancer Roadmap lays out build information in a table with rows
			and columns. Each row represents a license level and each
			column a category of essential build information.
			<ol>
				<li>
					<span class="inline-header">Level Up:</span> The set of
					player choices that you add to your character whenever
					you level up. This includes skill triggers, talents,
					mech skills, licenses, and core bonuses. Anything you
					pick here automatically carries onto all later levels.
				</li>
				<li>
					<span class="inline-header">Active Frame:</span> Your
					choice of mech at any given level. This dictates your
					baseline mech stats and the weapon mounts available to you.
				</li>
				<li>
					<span class="inline-header">Systems:</span> A list of all
					selected systems, constrained by the SP budget available to
					you.
				</li>
				<li>
					<span class="inline-header">Mounts:</span> Your available
					weapons and any attachments they may have, as supported by
					the mounts available to you.
				</li>
			</ol>
			The roadmap is best navigated left to right and up to down.
			Choices toward the left can affect what is available anywhere
			to the right, whereas choices to the right typically have no effect
			on your options to their left.
		</p>
		<p>
			Later levels always inherit your Level Up choices. The other
			selection columns will inherit lower-level choices by default, but
			changing your selection there will override that default choice
			and prevent additional changes at lower levels from affecting them.
		</p>
		<p>
			Most build choices are configured as selection bubbles with
			drop-down menus. When you make a selection, affected bubbles update
			their available options. If one of your active selections becomes
			unavailable, it remains selected but is marked as invalid. Try it
			out with the example selectors below.
		</p>
		<div class="tutorial-selector-examples">
			<div class="inline-components">
				<span class="inline-header">License</span>
				<div example-license></div>
			</div>
			<div class="inline-components">
				<span class="inline-header">System</span>
				<div data-example-2></div>
			</div>
		</div>
		<p>
			The toolbar at the top of the page allows you to name your roadmap,
			set the license level at which the roadmap ends, manage imported
			LCPs, switch between light and dark UI, toggle on/off exotic
			components, and
			<span class="inline-header">save</span>
			<button id="save-btn"
					class="menu-btn"
					title="Save roadmap to file">
				<i class="fa fa-save"></i>
			</button>
			your work to a JSON file or
			<span class="inline-header">load</span>
			<button id="load-btn"
					class="menu-btn"
					title="Load roadmap from file">
				<i class="fa fa-folder-open"></i>
			</button>
			a roadmap from a file over any existing data.
		</p>
	</section>
	<section class="modal-text-box">
		<h2>Tags</h2>
		<p>
			Many equipment choices have important properties called "tags" that
			impact their use or eligibility. All tags are listed when hovering
			over a system/weapon's name, and the AI, Exotic, Limited, and
			Unique tags are displayed under all selected equipment that has
			them.
		</p>
		<p>
			Additionally, special mount and weapon tags may become available to
			you based on the core bonuses, systems, and weapons you select.
			These tags can be dragged and dropped onto valid targets for
			assignment.
		</p>
		<div class="tutorial-selector-examples">
			<div class="select-group">
				<span class="inline-header">Mod</span>
				<div class="attachment-menu" data-example-mod></div>
			</div>
			<div class="select-group">
				<span class="inline-header">Weapons</span>
				<div data-example-3></div>
				<div data-example-4></div>
			</div>
		</div>
	</section>`;

function renderTutorialMod(name) {
	const tag = document.createElement('div');
	tag.className = 'tag mod-tag';
	tag.title = 'Drag to an occupied selection bubble';

	const label = document.createElement('span');
	label.textContent = name;
	tag.append(label);

	const clear = document.createElement('button');
	clear.type = 'button';
	clear.className = 'clear';
	clear.title = 'Remove mod';
	tag.append(clear);
	return { tag, clear };
}

export function render({ close }) {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = tutorialContent;
	const modSource = content.querySelector('[data-example-mod]');
	const { tag: modTag, clear: clearMod } = renderTutorialMod('Example Mod');

	const stateMap = new Map();
	const attachments =
		createDummyAttachmentManager(stateMap, TUTORIAL_MOD_TRANSFER_TYPE);
	attachments.register({
		id: EXAMPLE_MOD_ID,
		tag: modTag,
		source: modSource,
		clear: clearMod
	});

	const selectors = renderDummySelectors(
		content,
		[
			{
				key: 'license',
				target: '[example-license]',
				template: SELECT_TEMPLATE.LICENSE,
				closeOnChange: ['system']
			},
			{
				key: 'system',
				target: '[data-example-2]',
				template: SELECT_TEMPLATE.SYSTEM,
				isAvailable: ({ id, stateMap }) =>
					isExampleSystemAvailable(id, stateMap.get('license')?.id)
			},
			...exampleMount.map((slot, index) => ({
				key: `weapon-${index}`,
				target: `[data-example-${index + 3}]`,
				template: SELECT_TEMPLATE.WEAPON,
				context: { slot },
				initialData: { attachments: [] },
				isAvailable: ({ id, stateMap }) =>
					isExampleWeaponAvailable(index, id,
						stateMap.get('license')?.id),
				onChange: ({ key, data }) => {
					if (!data.id)
						attachments.clearSelector(key);
				}
			}))
		],
		stateMap
	);

	for (const key of exampleMount.map((_, index) => `weapon-${index}`))
		attachments.registerTarget(key, selectors.get(key));

	return content;
}