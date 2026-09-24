// constants.js

export const MAX_MOUNT_COUNT = 3;

export const STAT_DEFINITIONS = {
	hp: {
		frameProperty: 'hp',
		label: 'HP'
	},
	evasion: {
		frameProperty: 'evasion',
		label: 'Evasion'
	},
	tech_attack: {
		frameProperty: 'tech_attack',
		label: 'Tech Attack'
	},
	edef: {
		frameProperty: 'edef',
		label: 'E\u2011Defense'
	},
	heatcap: {
		frameProperty: 'heatcap',
		label: 'Heat Capacity'
	},
	save: {
		frameProperty: 'save',
		label: 'Save Target'
	},
	repcap: {
		frameProperty: 'repcap',
		label: 'Repair Capacity'
	},
	speed: {
		frameProperty: 'speed',
		label: 'Speed'
	},
	sp: {
		frameProperty: 'sp',
		label: 'System Points'
	},
	armor: {
		frameProperty: 'armor',
		label: 'Armor'
	},
	size: {
		frameProperty: 'size',
		label: 'Size'
	},
	sensor_range: {
		frameProperty: 'sensor_range',
		label: 'Sensors',
		allowModifiers: false
	},
	limited_bonus: {
		defaultValue: 0,
		display: false
	},
	ai_cap: {
		defaultValue: 1,
		display: false
	},
	sp_budget: {
		display: false
	},
	ai_budget: {
		display: false
	}
};

export const MECH_STAT_IDS = Object.freeze(
	Object.keys(STAT_DEFINITIONS)
);

export const DISPLAYED_MECH_STAT_IDS = Object.freeze(
	Object.entries(STAT_DEFINITIONS)
		.filter(([, definition]) =>
			definition.display !== false
		)
		.map(([statId]) => statId)
);

export const ROMAN_NUMERALS = ['I', 'II', 'III'];

export const HASE_MAP = {
	hull: {
		label: 'Hull'
	},
	agility: {
		label: 'Agi'
	},
	systems: {
		label: 'Sys'
	},
	engineering: {
		label: 'Eng'
	}
}

export const THEME = Object.freeze({
	LIGHT: 'gms-light',
	DARK: 'gms-dark'
});