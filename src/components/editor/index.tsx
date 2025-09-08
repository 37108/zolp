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

			const decorations: Decoration[] = []
			doc.descendants((node, position) => {
				const line = lines.indexOf(node.text ?? '')
				if (line <= -1) {
					return
				}
				messages
					.filter((message) => message.line === line + 1)
					.forEach((message) => {
						console.log(message)
						decorations.push(
							Decoration.inline(
								position + message.column - 1,
								position + message.column + 1,
								{
									class: 'border-b border-red-300',
									title: message.message,
								},
							),
						)
					})
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
