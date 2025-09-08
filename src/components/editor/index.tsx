import {
	editorViewCtx,
	Editor as MilkdownEditor,
	rootCtx,
	serializerCtx,
} from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import {
	commonmark,
	toggleEmphasisCommand,
	toggleStrongCommand,
} from '@milkdown/kit/preset/commonmark'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import { $prose, callCommand } from '@milkdown/kit/utils'
import { Milkdown, useEditor } from '@milkdown/react'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'
// biome-ignore lint/suspicious/noTsIgnore: not problem
// @ts-ignore
import 'zenn-content-css'
import { Bold, Italic } from 'lucide-react'
import { cn } from '../../utils/cn'

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

	const handleStrong = () => {
		const editor = get()
		if (!editor) {
			return
		}
		editor.action(callCommand(toggleStrongCommand.key))
	}

	const handleItalic = () => {
		const editor = get()
		if (!editor) {
			return
		}
		editor.action(callCommand(toggleEmphasisCommand.key))
	}

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
				if (!node.isText || !node.text) return

				// 現在のノードが含まれる行を特定
				let currentLine = 0
				for (let i = 0; i < lines.length; i++) {
					if (lines[i].includes(node.text)) {
						currentLine = i + 1
						break
					}
				}

				messages
					.filter((message) => message.line === currentLine)
					.forEach((message) => {
						// Markdownの位置からテキストノード内の位置を計算
						const markdownLine = lines[currentLine - 1]
						const textInLine = node.text ?? ''
						const textStart = markdownLine.indexOf(textInLine)

						if (textStart !== -1 && message.column > textStart) {
							const adjustedColumn = message.column - textStart - 1
							if (adjustedColumn >= 0 && adjustedColumn < textInLine.length) {
								decorations.push(
									Decoration.inline(
										position + adjustedColumn,
										position + adjustedColumn + 1,
										{
											class: cn('border-b', 'border-red-300'),
											title: message.message,
										},
									),
								)
							}
						}
					})
			})

			const decorationSet = DecorationSet.create(doc, decorations)
			view.dispatch(view.state.tr.setMeta(textlintPluginKey, decorationSet))
		})
	}

	return (
		<div>
			<div className={cn('flex', 'gap-2', 'flex-wrap')}>
				<button
					type="button"
					onClick={handleStrong}
					className={cn('p-1', 'rounded-sm', 'hover:bg-neutral-100')}
				>
					<Bold strokeWidth={1} stroke="currentcolor" />
				</button>
				<button
					type="button"
					onClick={handleItalic}
					className={cn('p-1', 'rounded-sm', 'hover:bg-neutral-100')}
				>
					<Italic strokeWidth={1} stroke="currentcolor" />
				</button>
			</div>
			<div
				className={cn(
					'znc',
					'mt-2',
					'px-4',
					'py-2',
					'bg-neutral-100',
					'border',
					'border-neutral-200',
					'rounded-b-md',
					'shadow',
				)}
			>
				<Milkdown />
			</div>
		</div>
	)
}
