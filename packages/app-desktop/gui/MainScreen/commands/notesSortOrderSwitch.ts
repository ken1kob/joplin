import { CommandContext, CommandDeclaration, CommandRuntime } from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

const FIELD = 'notes.sortOrder.field';
const REVERSE = 'notes.sortOrder.reverse';
const ENABLED = 'notes.perFieldReversalEnabled';
const PER_FIELD_REVERSE = 'notes.perFieldReverse';
let fields: string[] = null;
let perFieldReverse: { [field: string]: boolean } = null;

export const notesSortOrderFieldArray = (): string[] => {
	// The order of the fields is strictly determinate.
	if (fields == null) {
		fields = Setting.enumOptionValues(FIELD).sort().reverse();
	}
	return fields;
}

export const notesSortOrderNextField = (currentField: string) => {
	const fields = notesSortOrderFieldArray();
	const index = fields.indexOf(currentField);
	if (index < 0) {
		return currentField;
	} else {
		return fields[(index + 1) % fields.length];
	}
}

export const declaration: CommandDeclaration = {
	name: 'notesSortOrderSwitch',
	label: () => _('Switch sort order'),
	parentLabel: () => _('Notes'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, field?: string | Array<any>, reverse?: boolean) => {
			// field: Sort order's field. undefined means switching a field.
			// reverse: true means the sort order is reversed. undefined means toggling normal/reverse.
			//
			// To support CommandService.cheduleExecute(), field accepts an size-two Array, 
			// which means [field, reverse].
			let nextField: string;
			let nextReverse: boolean;
			if (typeof field !== 'object') {
				nextField = field;
				nextReverse = reverse;
			} else {
				nextField = field[0];
				nextReverse = field[1];
			}
			const currentField = Setting.value(FIELD);
			const currentReverse = Setting.value(REVERSE);
			const enabled = Setting.value(ENABLED);
			if (enabled) {
				if (perFieldReverse == null) {
					perFieldReverse = { ...Setting.value(PER_FIELD_REVERSE) };
				}
			}
			if (typeof field === 'undefined') {
				if (typeof reverse === 'undefined') {
					// If both arguments are undefined, the next field is selected.
					nextField = notesSortOrderNextField(currentField);
				} else {
					nextField = currentField;
				}
			}
			if (typeof reverse === 'undefined') {
				if (enabled && perFieldReverse.hasOwnProperty(nextField)) {
					nextReverse = !!perFieldReverse[nextField];
				} else {
					nextReverse = currentReverse;
				}
			}
			if (currentField !== nextField) {
				Setting.setValue(FIELD, nextField);
			}
			if (currentReverse !== nextReverse) {
				Setting.setValue(REVERSE, nextReverse);
			}
			if (enabled) {
				// nextField is sane here.
				nextReverse = !!nextReverse;
				if (perFieldReverse[nextField] !== nextReverse) {
					perFieldReverse[nextField] = nextReverse;
					Setting.setValue(PER_FIELD_REVERSE, { ...perFieldReverse });
				}
			}
		},
	};
};
