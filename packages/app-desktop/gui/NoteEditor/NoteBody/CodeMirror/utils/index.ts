import { useEffect, useCallback, useRef, useState } from 'react';
import shim from '@joplin/lib/shim';

export function cursorPositionToTextOffset(cursorPos: any, body: string) {
	if (!body) return 0;

	const noteLines = body.split('\n');

	let pos = 0;
	for (let i = 0; i < noteLines.length; i++) {
		if (i > 0) pos++; // Need to add the newline that's been removed in the split() call above

		if (i === cursorPos.line) {
			pos += cursorPos.ch;
			break;
		} else {
			pos += noteLines[i].length;
		}
	}

	return pos;
}

export function usePrevious(value: any): any {
	const ref = useRef();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}

export function useScrollHandler(editorRef: any, webviewRef: any, onScroll: Function) {
	const ignoreNextEditorScrollEvent_ = useRef(false);
	const scrollTimeoutId_ = useRef<any>(null);

	const scheduleOnScroll = useCallback((event: any) => {
		if (scrollTimeoutId_.current) {
			shim.clearTimeout(scrollTimeoutId_.current);
			scrollTimeoutId_.current = null;
		}

		scrollTimeoutId_.current = shim.setTimeout(() => {
			scrollTimeoutId_.current = null;
			onScroll(event);
		}, 10);
	}, [onScroll]);

	const setEditorPercentScroll = useCallback((p: number) => {
		ignoreNextEditorScrollEvent_.current = true;

		if (editorRef.current) {
			editorRef.current.setScrollPercent(p);

			scheduleOnScroll({ percent: p });
		}
	}, [scheduleOnScroll]);

	const setViewerPercentScroll = useCallback((p: number) => {
		if (webviewRef.current) {
			webviewRef.current.wrappedInstance.send('setPercentScroll', p);
			scheduleOnScroll({ percent: p });
		}
	}, [scheduleOnScroll]);

	const translateScrollPercent_ = (percent: number, editorToViewer: boolean) => {
		// If the input is out of (0,1), it is not translated.
		if (percent <= 0 || percent >= 1) return percent;
		const map = webviewRef.current?.wrappedInstance.scrollPercentMap();
		const cm = editorRef.current;
		if (!map || map.length <= 2 || !cm) return percent;  // no translation
		const info = cm.getScrollInfo();
		const height = Math.max(1, info.height - info.clientHeight);
		let field = 'percent', target = percent;
		if (editorToViewer) {
			const top = percent * height;
			const line = cm.lineAtHeight(top, 'local');
			field = 'line';
			target = line;
		}
		// Binary search (rightmost): finds where map[r-1][field] <= target < map[r][field]
		let l = 1, r = map.length - 1;
		while (l < r) {
			const m = Math.floor(l + (r - l) / 2);
			if (target < map[m][field]) r = m; else l = m + 1;
		}
		const lineU = map[r - 1].line;
		const lineL = Math.min(cm.lineCount(), map[r].line);
		const ePercentU = Math.min(1, cm.heightAtLine(lineU, 'local') / height);
		const ePercentL = Math.min(1, cm.heightAtLine(lineL, 'local') / height);
		let result;
		if (editorToViewer) {
			const linInterp = (percent - ePercentU) / (ePercentL - ePercentU);
			result = map[r - 1].percent + (map[r].percent - map[r - 1].percent) * linInterp;
			//console.log(`Editor->Viewer: ep${percent} ${lineU} ${lineL}  li${linInterp}  vp${result} ${map[r - 1].percent} ${map[r].percent}`);
		} else {
			const linInterp = (percent - map[r - 1].percent) / (map[r].percent - map[r - 1].percent);
			result = ePercentU + (ePercentL - ePercentU) * linInterp;
			//console.log(`Viewer->Editor: ep${result} ${lineU} ${lineL}  li${linInterp}  vp${percent} ${map[r - 1].percent} ${map[r].percent}`);
		}
		return result;
	};

	const translateScrollPercentFromViewerToEditor = (viewerPercent: number) => {
		const editorPercent = translateScrollPercent_(viewerPercent, false);
		return editorPercent;
	}

	const translateScrollPercentFromEditorToViewer = (editorPercent: number) => {
		const viewerPercent = translateScrollPercent_(editorPercent, true);
		return viewerPercent;
	}

	const editor_scroll = useCallback(() => {
		if (ignoreNextEditorScrollEvent_.current) {
			ignoreNextEditorScrollEvent_.current = false;
			return;
		}

		if (editorRef.current) {
			const editorPercent = editorRef.current.getScrollPercent();
			if (!isNaN(editorPercent)) {
				// when switching to another note, the percent can sometimes be NaN
				// this is coming from `gui/NoteEditor/NoteBody/CodeMirror/utils/useScrollUtils.ts`
				// when CodeMirror returns scroll info with heigth == clientHeigth
				// https://github.com/laurent22/joplin/issues/4797
				const viewerPercent = translateScrollPercentFromEditorToViewer(editorPercent);
				setViewerPercentScroll(viewerPercent);
			}
		}
	}, [setViewerPercentScroll]);

	const resetScroll = useCallback(() => {
		if (editorRef.current) {
			editorRef.current.setScrollPercent(0);
		}
	}, []);

	return {
		resetScroll, setEditorPercentScroll, setViewerPercentScroll, editor_scroll,
		translateScrollPercentFromViewerToEditor, translateScrollPercentFromEditorToViewer,
	};
}


export function useRootSize(dependencies: any) {
	const { rootRef } = dependencies;

	const [rootSize, setRootSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		if (!rootRef.current) return;

		const { width, height } = rootRef.current.getBoundingClientRect();

		if (rootSize.width !== width || rootSize.height !== height) {
			setRootSize({ width: width, height: height });
		}
	});

	return rootSize;
}
