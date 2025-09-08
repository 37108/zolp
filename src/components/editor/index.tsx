import {
	defaultValueCtx,
	editorViewCtx,
	Editor as MilkdownEditor,
	rootCtx,
	serializerCtx,
} from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { Milkdown, useEditor } from '@milkdown/react'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'

import '@milkdown/crepe/theme/common/style.css'
import type { Node } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'

const markdown = `textlint の導入サンプル

<br />


テキストを編集して入力してください

`

const textlintPluginKey = new PluginKey<DecorationSet>('textlint')

const textlintPlugin = $prose(() => {
	return new Plugin({
		key: textlintPluginKey,
		state: {
			init() {
				return DecorationSet.empty
			},
			apply(tr, decorationSet) {
				const newDecorationSet = tr.getMeta(textlintPluginKey)
				return newDecorationSet || decorationSet.map(tr.mapping, tr.doc)
			},
		},
		props: {
			decorations(state) {
				return textlintPluginKey.getState(state)
			},
		},
	})
})

export const Editor = () => {
	const { get } = useEditor((root) => {
		return MilkdownEditor.make()
			.config((ctx) => {
				ctx.set(rootCtx, root)
				ctx.set(defaultValueCtx, markdown)
				ctx.get(listenerCtx).updated((ctx) => {
					const editorView = ctx.get(editorViewCtx)
					const serializer = ctx.get(serializerCtx)
					worker.postMessage({
						command: 'lint',
						text: serializer(editorView.state.doc),
						ext: '.md',
					})
				})
			})
			.use(commonmark)
			.use(listener)
			.use(textlintPlugin)
	})

	worker.onmessage = (event: TextLintMessageEvent) => {
		if (event.data.command === 'lint') {
			return
		}
		if (!event.data.result?.messages) {
			return
		}

		const messages = event.data.result.messages
		const editor = get()

		if (!editor) {
			return
		}

		editor.action((ctx) => {
			const view = ctx.get(editorViewCtx)
			const serializer = ctx.get(serializerCtx)

			const doc = view.state.doc
			const markdown = serializer(doc)
			const lines = markdown.split('\n')

			const decorations: Decoration[] = messages.map((message) => {
				const position = findPositionInDoc(
					doc,
					message.line,
					message.column,
					lines,
				)

				return Decoration.inline(
					position,
					position + message.range[1] - message.range[0],
					{
						class: 'border-b border-red-300',
						title: message.message,
					},
				)
			})

			const decorationSet = DecorationSet.create(doc, decorations)
			view.dispatch(view.state.tr.setMeta(textlintPluginKey, decorationSet))
		})
	}

	return (
		<div className="bg-neutral-100  py-2 px-4 rounded-md border border-neutral-300">
			<Milkdown />
		</div>
	)
}

function findPositionInDoc(
	doc: Node,
	targetLine: number,
	targetColumn: number,
	markdownLines: string[],
): number {
	let targetOffset = 0
	for (let i = 0; i < targetLine - 1; i++) {
		targetOffset += markdownLines[i].length + 1
	}
	targetOffset += targetColumn - 1

	let currentMarkdownOffset = 0
	let proseMirrorPos = 0
	let found = false

	doc.descendants((node, pos) => {
		if (found) return false

		const nodeMarkdownLength = estimateMarkdownLength(node)

		if (currentMarkdownOffset + nodeMarkdownLength >= targetOffset) {
			const relativeOffset = targetOffset - currentMarkdownOffset
			proseMirrorPos = pos + Math.min(relativeOffset, node.nodeSize - 1)
			found = true
			return false
		}

		currentMarkdownOffset += nodeMarkdownLength
	})

	return proseMirrorPos
}

function estimateMarkdownLength(node: Node): number {
	switch (node.type.name) {
		case 'heading':
			return node.attrs.level + 1 + node.textContent.length + 1
		case 'paragraph':
			return node.textContent.length + 1
		case 'code_block':
			return (
				3 +
				(node.attrs.language?.length || 0) +
				1 +
				node.textContent.length +
				1 +
				3
			)
		default:
			return node.textContent.length
	}
}
