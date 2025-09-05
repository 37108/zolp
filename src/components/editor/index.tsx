import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

const theme = {
	heading: {
		h1: "text-3xl font-bold mb-4",
		h2: "text-2xl font-bold mb-3",
		h3: "text-xl font-bold mb-2",
	},
	quote: "border-l-4 border-gray-300 pl-4 italic text-gray-600",
	list: {
		ul: "list-disc ml-6 mb-4",
		ol: "list-decimal ml-6 mb-4",
	},
	code: "bg-gray-100 px-2 py-1 rounded font-mono text-sm",
	codeHighlight: {
		code: "bg-gray-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto",
	},
	link: "text-blue-600 underline hover:text-blue-800",
};

export const onError = (error: Error) => {
	console.error(error);
};

export const Editor = () => {
	const initialConfig = {
		namespace: "MyEditor",
		theme,
		onError,
		nodes: [
			HeadingNode,
			QuoteNode,
			ListNode,
			ListItemNode,
			CodeNode,
			CodeHighlightNode,
			LinkNode,
		],
	};

	return (
		<div className="max-w-4xl mx-auto p-6">
			<LexicalComposer initialConfig={initialConfig}>
				<div className="relative border border-gray-200 rounded-lg shadow-sm">
					<RichTextPlugin
						contentEditable={
							<ContentEditable className="min-h-96 p-4 outline-none prose prose-lg max-w-none" />
						}
						placeholder={
							<div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
								マークダウンを入力してください...
							</div>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
				</div>
				<HistoryPlugin />
				<AutoFocusPlugin />
				<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
			</LexicalComposer>
		</div>
	);
};
