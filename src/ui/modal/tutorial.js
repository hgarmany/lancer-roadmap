import {
	srcData
} from '../../data/loader.js';

import {
	renderSelector,
	SELECT_TEMPLATE,
	setOptionHidden,
	setSelectorClass,
	setSelectorOpen
} from '../selectors.js';

import {
	isFrameIntegratedItem
} from '../../rules/installsCommon.js';

function isExampleSystemAvailable(id, licenseId) {
	if (!id)
		return true;

	const item = srcData.systems.get(id);
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
				<div data-example-1></div>
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
	</section>`;

let exampleLicenseId = null;
let systemSelector;

const exampleSystem = SELECT_TEMPLATE.SYSTEM;
exampleSystem.getEligibility = ({ id }) => isExampleSystemAvailable(id, exampleLicenseId);
exampleSystem.changeEvent = selector => {
	setSelectorClass(selector, 'occupied', selector.value);
	setSelectorClass(selector, 'error', selector.value &&
		!isExampleSystemAvailable(selector.value, exampleLicenseId));
};

const exampleLicense = SELECT_TEMPLATE.LICENSE;
exampleLicense.getEligibility = () => true;
exampleLicense.changeEvent = selector => {
	exampleLicenseId = selector.value || null;
	setSelectorClass(selector, 'occupied', exampleLicenseId);
	setSelectorOpen(systemSelector, false);
	for (const option of systemSelector.querySelectorAll('.selector-option'))
		setOptionHidden(option,
			!isExampleSystemAvailable(option.value, exampleLicenseId));
	exampleSystem.changeEvent(systemSelector);
};

export function render({ close }) {
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = tutorialContent;

	content.querySelector('[data-example-1]').replaceWith(
		renderSelector(1, null, exampleLicense));
	systemSelector = renderSelector(1, null, exampleSystem);
	content.querySelector('[data-example-2]').replaceWith(systemSelector);

	return content;
}