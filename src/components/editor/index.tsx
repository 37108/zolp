import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { TRANSFORMERS } from '@lexical/markdown'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TextlintErrorNode } from './textlint-error-node'
import { TextlintPlugin } from './textlint-plugin'

export const onError = (error: Error) => {
	console.error(error)
}

export const Editor = () => {
	const initialConfig = {
		namespace: 'MyEditor',
		theme: {},
		onError,
		nodes: [
			HeadingNode,
			QuoteNode,
			ListNode,
			ListItemNode,
			CodeNode,
			CodeHighlightNode,
			LinkNode,
			TextlintErrorNode,
		],
	}

	return (
		<div className="max-w-6xl mx-auto p-6">
			<LexicalComposer initialConfig={initialConfig}>
				<div className="relative border border-gray-200 rounded-lg shadow-sm">
					<RichTextPlugin
						contentEditable={
							<ContentEditable className="znc min-h-96 p-4 outline-none prose prose-lg max-w-none" />
						}
						placeholder={
							<div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
								本文を入力してください。
							</div>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
				</div>
				<HistoryPlugin />
				<AutoFocusPlugin />
				<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
				<TextlintPlugin />
			</LexicalComposer>
		</div>
	)
}
