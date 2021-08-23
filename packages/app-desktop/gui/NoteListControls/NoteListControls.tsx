import * as React from 'react';
import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import { notesSortOrderNextField } from '../MainScreen/commands/notesSortOrderSwitch';
const styled = require('styled-components').default;

interface Props {
	showNewNoteButtons: boolean;
	height: number;
}

const StyledRoot = styled.div`
	box-sizing: border-box;
	height: ${(props: any) => props.height}px;
	display: flex;
	flex-direction: row;
	padding: ${(props: any) => props.theme.mainPadding}px;
	background-color: ${(props: any) => props.theme.backgroundColor3};
`;

const StyledButton = styled(Button)`
	margin-left: 8px;
`;

const StyledPairButtonR = styled(Button)`
	margin-left: 8px;
	border-radius: 5px 0 0 5px;
`;

const StyledPairButtonL = styled(Button)`
	margin-left: 0px;
	border-radius: 0 5px 5px 0;
	border-width: 1px 1px 1px 0;
	min-width: 10px;
	width: auto;
`;

const ButtonContainer = styled.div`
	display: flex;
	flex-direction: row;
`;

export default function NoteListControls(props: Props) {
	const searchBarRef = useRef(null);

	useEffect(function() {
		CommandService.instance().registerRuntime('focusSearch', focusSearchRuntime(searchBarRef));

		return function() {
			CommandService.instance().unregisterRuntime('focusSearch');
		};
	}, []);

	function onNewTodoButtonClick() {
		void CommandService.instance().execute('newTodo');
	}

	function onNewNoteButtonClick() {
		void CommandService.instance().execute('newNote');
	}

	function onSortOrderFieldButtonClick() {
		void CommandService.instance().execute('notesSortOrderSwitch');
	}

	function onSortOrderReverseButtonClick() {
		void CommandService.instance().execute('notesSortOrderToggleReverse');
	}

	function sortOrderFieldTip() {
		const term1 = CommandService.instance().label('notesSortOrderSwitch');
		const field = Setting.value('notes.sortOrder.field');
		const term2 = Note.fieldToLabel(field);
		const term3 = Note.fieldToLabel(notesSortOrderNextField(field));
		return `${term1}:\n ${term2} -> ${term3}`;
	}

	function sortOrderFieldIcon() {
		const field = Setting.value('notes.sortOrder.field');
		const iconMap: any = {
			user_updated_time: 'fas fa-calendar-alt',
			user_created_time: 'fas fa-calendar-plus',
			title: 'fas fa-heading',
			order: 'far fa-hand-point-up',
		}
		return (iconMap[field] || iconMap['title']) + ' ' + field;
	}

	function sortOrderReverseIcon() {
		return Setting.value('notes.sortOrder.reverse') ? "fas fa-long-arrow-alt-up" : "fas fa-long-arrow-alt-down";
	}

	function renderNewNoteButtons() {
		if (!props.showNewNoteButtons) return null;

		const soButtonsVisible = Setting.value('notes.sortOrder.buttonsVisible');

		return (
			<ButtonContainer>
				{ soButtonsVisible &&
					<StyledPairButtonR
						className="sort-order-field-button"
						tooltip={sortOrderFieldTip()}
						iconName={sortOrderFieldIcon()}
						level={ButtonLevel.Secondary}
						onClick={onSortOrderFieldButtonClick}
					/>
				}
				{ soButtonsVisible &&
					<StyledPairButtonL
						className="sort-order-reverse-button"
						tooltip={CommandService.instance().label('notesSortOrderToggleReverse')}
						iconName={sortOrderReverseIcon()}
						level={ButtonLevel.Secondary}
						onClick={onSortOrderReverseButtonClick}
					/>
				}
				<StyledButton
					className="new-todo-button"
					tooltip={CommandService.instance().label('newTodo')}
					iconName="far fa-check-square"
					level={ButtonLevel.Primary}
					onClick={onNewTodoButtonClick}
				/>
				<StyledButton
					className="new-note-button"
					tooltip={CommandService.instance().label('newNote')}
					iconName="icon-note"
					level={ButtonLevel.Primary}
					onClick={onNewNoteButtonClick}
				/>
			</ButtonContainer>
		);
	}

	return (
		<StyledRoot height={props.height}>
			<SearchBar inputRef={searchBarRef}/>
			{renderNewNoteButtons()}
		</StyledRoot>
	);
}
