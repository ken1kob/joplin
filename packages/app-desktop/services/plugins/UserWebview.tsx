import * as React from 'react';
import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import useViewIsReady from './hooks/useViewIsReady';
import useThemeCss from './hooks/useThemeCss';
import useContentSize from './hooks/useContentSize';
import useSubmitHandler from './hooks/useSubmitHandler';
import useHtmlLoader from './hooks/useHtmlLoader';
import useWebviewToPluginMessages from './hooks/useWebviewToPluginMessages';
import useScriptLoader from './hooks/useScriptLoader';
import Logger from '@joplin/lib/Logger';
import styled from 'styled-components';
import { AppState } from '../../app.reducer';

const { connect } = require('react-redux');
const logger = Logger.create('UserWebview');

export interface Props {
	forwardedRef?: any;
	html?: string;
	scripts: string[];
	pluginId: string;
	viewId: string;
	themeId: number;
	minWidth?: number;
	minHeight?: number;
	fitToContent?: boolean;
	borderBottom?: boolean;
	theme?: any;
	onSubmit?: Function;
	onDismiss?: Function;
	onReady?: Function;
}

const StyledFrame = styled.iframe<{fitToContent: boolean; borderBottom: boolean}>`
	padding: 0;
	margin: 0;
	width: ${(props: any) => props.fitToContent ? `${props.width}px` : '100%'};
	height: ${(props: any) => props.fitToContent ? `${props.height}px` : '100%'};
	border: none;
	border-bottom: ${(props: any) => props.borderBottom ? `1px solid ${props.theme.dividerColor}` : 'none'};
`;

function serializeForm(form: any) {
	const output: any = {};
	const formData = new FormData(form);
	for (const key of formData.keys()) {
		output[key] = formData.get(key);
	}
	return output;
}

function serializeForms(document: any) {
	const forms = document.getElementsByTagName('form');
	const output: any = {};
	let untitledIndex = 0;

	for (const form of forms) {
		const name = `${form.getAttribute('name')}` || (`form${untitledIndex++}`);
		output[name] = serializeForm(form);
	}

	return output;
}

function UserWebview(props: Props) {
	const ref = props.forwardedRef;
	const minWidth = props.minWidth ? props.minWidth : 200;
	const minHeight = props.minHeight ? props.minHeight : 20;

	const viewRef = useRef(null);
	const isReady = useViewIsReady(viewRef);
	const cssFilePath = useThemeCss({ pluginId: props.pluginId, themeId: props.themeId });

	useEffect(() => {
		if (isReady && props.onReady) props.onReady();
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [isReady]);

	function frameWindow() {
		if (!viewRef.current) return null;
		return viewRef.current.contentWindow;
	}

	function postMessage(name: string, args: any = null) {
		const win = frameWindow();
		if (!win) return;

		logger.debug('Got message', name, args);

		win.postMessage({ target: 'webview', name, args }, '*');
	}

	useImperativeHandle(ref, () => {
		return {
			formData: function() {
				if (viewRef.current) {
					return serializeForms(frameWindow().document);
				} else {
					return null;
				}
			},
			focus: function() {
				if (viewRef.current) viewRef.current.focus();
			},
		};
	});

	const htmlHash = useHtmlLoader(
		frameWindow(),
		isReady,
		postMessage,
		props.html
	);

	const contentSize = useContentSize(
		frameWindow(),
		htmlHash,
		minWidth,
		minHeight,
		props.fitToContent,
		isReady
	);

	useSubmitHandler(
		frameWindow(),
		props.onSubmit,
		props.onDismiss,
		htmlHash
	);

	useWebviewToPluginMessages(
		frameWindow(),
		isReady,
		props.pluginId,
		props.viewId,
		postMessage
	);

	useScriptLoader(
		postMessage,
		isReady,
		props.scripts,
		cssFilePath
	);

	return <StyledFrame
		id={props.viewId}
		width={contentSize.width}
		height={contentSize.height}
		fitToContent={props.fitToContent}
		ref={viewRef}
		src="services/plugins/UserWebviewIndex.html"
		borderBottom={props.borderBottom}
	></StyledFrame>;
}

const mapStateToProps = (state: AppState, ownProps: Props) => {
	const pluginHtmlContents = state.pluginService.pluginHtmlContents;
	const html = pluginHtmlContents?.[ownProps.pluginId]?.[ownProps.viewId] ?? '';
	return {
		html: html,
	};
};

// Since only redux v6 and higher support connect() for forwardRef of function component,
// a component wrapped by connect() is passed to forwardRef() to support mapStateToProps.
const ConnectedUserWebview = connect(mapStateToProps)(UserWebview);
export default forwardRef((props: Props, ref) => <ConnectedUserWebview {...props} forwardedRef={ref} />);
