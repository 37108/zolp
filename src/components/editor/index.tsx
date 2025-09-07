import {
	defaultValueCtx,
	editorViewCtx,
	Editor as MilkdownEditor,
	rootCtx,
	serializerCtx,
} from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import type { Node } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'
import { Milkdown, useEditor } from '@milkdown/react'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'

const markdown = `## Milkdown React Commonmark

### What is This ?

[link](https://example.com)

> You're scared of a world where you're needed.

This is a demo for using Milkdown with **React**.`

// TextLintのエラー装飾用プラグインキーですわ
const textlintPluginKey = new PluginKey('textlint')

// エラー装飾用のプラグインを作成する関数ですわ
const createTextlintPlugin = () => {
	return $prose(() => {
		return new Plugin({
			key: textlintPluginKey,
			state: {
				init() {
					return DecorationSet.empty
				},
				apply(tr, oldState) {
					// メタデータからデコレーションを取得しますわ
					const decorations = tr.getMeta(textlintPluginKey)
					if (decorations) {
						return decorations
					}
					// ドキュメントが変更された場合は、デコレーションをマッピングしますわ
					return tr.docChanged ? oldState.map(tr.mapping, tr.doc) : oldState
				},
			},
			props: {
				decorations(state) {
					return textlintPluginKey.getState(state)
				},
			},
		})
	})
}

export const Editor = () => {
	const { get } = useEditor((root) => {
		return MilkdownEditor.make()
			.config((ctx) => {
				ctx.set(rootCtx, root)
				ctx.set(defaultValueCtx, markdown)
				ctx.get(listenerCtx).updated((ctx, doc) => {
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
			.use(createTextlintPlugin())
	})

	worker.onmessage = (event: TextLintMessageEvent) => {
		if (event.data.command === 'lint') {
			return
		}
		if (!event.data.result?.messages) {
			return
		}

		const messages = event.data.result.messages

		// エディターインスタンスを取得しますわ
		const editor = get()
		if (!editor) return

		const ctx = editor.ctx
		const view = ctx.get(editorViewCtx)
		const decorations: Decoration[] = []

		// textlintのメッセージから装飾を作成しますわ
		messages.forEach((message) => {
			const doc = view.state.doc
			const serializer = ctx.get(serializerCtx)
			const markdownText = serializer(doc)

			// textlintのindex位置をProseMirrorの位置に変換しますわ
			if (message.range) {
				const from = getPositionFromTextIndex(
					doc,
					markdownText,
					message.range[0],
				)
				const to = getPositionFromTextIndex(doc, markdownText, message.range[1])

				if (from !== null && to !== null) {
					decorations.push(
						Decoration.inline(from, to, {
							class: 'border-b border-red-500',
							title: message.message,
						}),
					)
				}
			}
		})

		// 装飾をエディターに適用しますわ
		const decorationSet = DecorationSet.create(view.state.doc, decorations)
		const tr = view.state.tr.setMeta(textlintPluginKey, decorationSet)
		view.dispatch(tr)
	}

	return (
		<div className="editor bg-neutral-100  py-2 px-4 rounded-md border border-neutral-300 shadow-xl">
			<Milkdown />
		</div>
	)
}

// textlintのインデックス位置をProseMirrorの位置に変換するシンプル版ヘルパー関数ですわ
function getPositionFromTextIndex(
	doc: Node,
	markdownText: string,
	targetIndex: number,
): number | null {
	if (targetIndex < 0 || targetIndex > markdownText.length) return null

	// ProseMirrorのテキスト内容を取得しますわ
	let plainText = ''
	const positionMap: Array<{ textIndex: number; docPos: number }> = []

	// ドキュメントを走査してプレーンテキストと位置マップを作成しますわ
	doc.descendants((node: Node, pos: number) => {
		if (node.isText && node.text) {
			// 各文字の位置を記録しますわ
			for (let i = 0; i < node.text.length; i++) {
				positionMap.push({
					textIndex: plainText.length + i,
					docPos: pos + i,
				})
			}
			plainText += node.text
		} else if (node.isBlock && pos > 0) {
			// ブロック間に改行を追加しますわ
			// 空のブロックは改行として扱いますわ
			if (node.content.size === 0) {
				plainText += '\n'
			} else if (plainText.length > 0 && !plainText.endsWith('\n')) {
				plainText += '\n'
			}
		}
		return true
	})

	// Markdownテキストとプレーンテキストの対応を見つけますわ
	// textlintはMarkdownのインデックスを返すので、それに対応するProseMirror位置を探しますわ

	const beforeText = markdownText.substring(0, targetIndex)
	const textBeforeTarget = beforeText
		.replace(/\n+/g, '\n')
		.replace(/^\n+|\n+$/g, '')

	// プレーンテキスト内での位置を探しますわ
	let matchIndex = -1
	for (let i = 0; i <= plainText.length; i++) {
		const plainBefore = plainText
			.substring(0, i)
			.replace(/\n+/g, '\n')
			.replace(/^\n+|\n+$/g, '')
		if (plainBefore === textBeforeTarget) {
			matchIndex = i
			break
		}
	}

	if (matchIndex >= 0) {
		// 対応する位置を探しますわ
		const mapEntry = positionMap.find((entry) => entry.textIndex === matchIndex)
		if (mapEntry) {
			return mapEntry.docPos
		}

		// 最も近い位置を返しますわ
		if (positionMap.length > 0) {
			if (matchIndex <= positionMap[0].textIndex) {
				return positionMap[0].docPos
			}
			if (matchIndex >= positionMap[positionMap.length - 1].textIndex) {
				return positionMap[positionMap.length - 1].docPos + 1
			}

			for (let i = 0; i < positionMap.length - 1; i++) {
				if (
					matchIndex > positionMap[i].textIndex &&
					matchIndex < positionMap[i + 1].textIndex
				) {
					return positionMap[i].docPos + (matchIndex - positionMap[i].textIndex)
				}
			}
		}
	}

	return null
}
