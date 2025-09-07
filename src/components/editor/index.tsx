import {
	defaultValueCtx,
	editorViewCtx,
	Editor as MilkdownEditor,
	rootCtx,
	serializerCtx,
} from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'
import { Milkdown, useEditor } from '@milkdown/react'
import { nord } from '@milkdown/theme-nord'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'
import '@milkdown/theme-nord/style.css'

const markdown = `# Milkdown React Commonmark

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
					doc.toString()
					worker.postMessage({
						command: 'lint',
						text: serializer(editorView.state.doc),
						ext: '.md',
					})
				})
			})
			.config(nord)
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

		console.log(messages)

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
				const from = getPositionFromMarkdownIndex(
					doc,
					markdownText,
					message.range[0],
				)
				const to = getPositionFromMarkdownIndex(
					doc,
					markdownText,
					message.range[1],
				)

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

	return <Milkdown />
}

// Markdownのindex位置をProseMirrorの位置に変換する改良版ヘルパー関数ですわ
function getPositionFromMarkdownIndex(
	doc: any,
	markdownText: string,
	targetIndex: number,
): number | null {
	if (targetIndex < 0 || targetIndex > markdownText.length) return null

	// Markdownテキストとドキュメントの対応マップを作成しますわ
	const positionMap: Map<number, number> = new Map()
	let markdownIndex = 0

	// ドキュメントを走査して、各位置でのMarkdownインデックスを記録しますわ
	doc.descendants((node: any, pos: number) => {
		// テキストノードの場合
		if (node.isText) {
			const text = node.text
			for (let i = 0; i < text.length; i++) {
				// Markdownテキストの対応する文字を探しますわ
				while (markdownIndex < markdownText.length) {
					const markdownChar = markdownText[markdownIndex]
					const docChar = text[i]

					// 文字が一致する場合
					if (markdownChar === docChar) {
						positionMap.set(markdownIndex, pos + i)
						markdownIndex++
						break
					}
					// Markdownの改行や特殊文字をスキップしますわ
					if (markdownChar === '\n' || markdownChar === '\r') {
						markdownIndex++
					}
					// Markdownのマークアップ文字をスキップしますわ
					else if (isMarkdownMarkup(markdownText, markdownIndex)) {
						markdownIndex++
					} else {
						break
					}
				}
			}
		}
		// ブロックノードの終端で改行を考慮しますわ
		else if (node.isBlock && pos > 0) {
			// Markdownの改行を消費しますわ
			while (
				markdownIndex < markdownText.length &&
				(markdownText[markdownIndex] === '\n' ||
					markdownText[markdownIndex] === '\r')
			) {
				positionMap.set(markdownIndex, pos)
				markdownIndex++
			}
		}

		return true
	})

	// 最も近い位置を探しますわ
	let closestPos: number | null = null
	let closestDistance = Number.POSITIVE_INFINITY

	positionMap.forEach((pos, mdIndex) => {
		const distance = Math.abs(mdIndex - targetIndex)
		if (distance < closestDistance) {
			closestDistance = distance
			closestPos = pos
		}
	})

	// 見つからない場合は、線形補間で推定しますわ
	if (closestPos === null && positionMap.size > 0) {
		const entries = Array.from(positionMap.entries()).sort(
			(a, b) => a[0] - b[0],
		)

		for (let i = 0; i < entries.length - 1; i++) {
			const [mdIndex1, pos1] = entries[i]
			const [mdIndex2, pos2] = entries[i + 1]

			if (targetIndex >= mdIndex1 && targetIndex <= mdIndex2) {
				const ratio = (targetIndex - mdIndex1) / (mdIndex2 - mdIndex1)
				closestPos = Math.round(pos1 + ratio * (pos2 - pos1))
				break
			}
		}

		// 最後の位置より後の場合
		if (closestPos === null && entries.length > 0) {
			const [lastMdIndex, lastPos] = entries[entries.length - 1]
			if (targetIndex > lastMdIndex) {
				closestPos = lastPos + (targetIndex - lastMdIndex)
			}
		}
	}

	return closestPos
}

// Markdownのマークアップ文字かどうかを判定するヘルパー関数ですわ
function isMarkdownMarkup(text: string, index: number): boolean {
	const char = text[index]
	const prevChar = index > 0 ? text[index - 1] : ''
	const nextChar = index < text.length - 1 ? text[index + 1] : ''

	// 一般的なMarkdownマークアップ文字をチェックしますわ
	if (
		char === '*' ||
		char === '_' ||
		char === '`' ||
		char === '#' ||
		char === '>' ||
		char === '[' ||
		char === ']' ||
		char === '(' ||
		char === ')' ||
		char === '!' ||
		char === '-' ||
		char === '+'
	) {
		// リスト記号の場合
		if (
			(char === '-' || char === '+' || char === '*') &&
			(prevChar === '\n' || index === 0) &&
			nextChar === ' '
		) {
			return true
		}

		// 見出しの場合
		if (char === '#' && (prevChar === '\n' || index === 0)) {
			return true
		}

		// 引用の場合
		if (char === '>' && (prevChar === '\n' || index === 0)) {
			return true
		}

		// 強調やコードの場合
		if (
			(char === '*' || char === '_' || char === '`') &&
			(nextChar === char || prevChar === char)
		) {
			return true
		}

		return false
	}

	return false
}
