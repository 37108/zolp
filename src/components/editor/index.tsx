import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

const theme = {};

export const onError = (error: Error) => {
	console.error(error);
};

export const Editor = () => {
	const initialConfig = {
		namespace: "MyEditor",
		theme,
		onError,
	};

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<RichTextPlugin
				contentEditable={<ContentEditable />}
				ErrorBoundary={LexicalErrorBoundary}
			/>
			<HistoryPlugin />
			<AutoFocusPlugin />
		</LexicalComposer>
	);
};
