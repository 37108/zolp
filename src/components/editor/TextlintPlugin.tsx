import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
	$getRoot,
	$isElementNode,
	$isTextNode,
	createCommand,
	type LexicalCommand,
} from 'lexical'
import { useEffect } from 'react'
import z from 'zod'
import textlintWorker from '/textlint-worker.js?url'

const TextLintMessageEvent = z.object({
	data: z.object({
		command: z.enum(['lint:result']),
		result: z.object({
			filePath: z.string(),
			messages: z.array(
				z.object({
					type: z.enum(['lint']),
					ruleId: z.string(),
					message: z.string(),
					severity: z.number(),
					column: z.number(),
					index: z.number(),
					line: z.number(),
					loc: z.object({
						end: z.object({ line: z.number(), column: z.number }),
						start: z.object({ line: z.number(), column: z.number }),
					}),
					range: z.array(z.number()),
				}),
			),
		}),
	}),
})
type TextLintMessageEvent = z.infer<typeof TextLintMessageEvent>

const worker = new Worker(textlintWorker)

export const LINT_TEXT_COMMAND: LexicalCommand<string> = createCommand()

export const TextlintPlugin = () => {
	const [editor] = useLexicalComposerContext()

	worker.onmessage = (event: TextLintMessageEvent) => {
		editor.update(() => {
			if (event.data.command === 'lint:result') {
				const { messages } = event.data.result
				const root = $getRoot()

				// 既存の警告マークを削除
				root.getChildren().forEach((child) => {
					if ($isElementNode(child)) {
						child.getChildren().forEach((textNode) => {
							if ($isTextNode(textNode)) {
								textNode.setFormat(0)
								textNode.setStyle('')
							}
						})
					}
				})

				for (const message of messages) {
					const [startIndex, endIndex] = message.range

					// テキストノードを見つけて範囲をマーク
					let currentIndex = 0
					root.getChildren().forEach((paragraph) => {
						if ($isElementNode(paragraph)) {
							paragraph.getChildren().forEach((textNode) => {
								if ($isTextNode(textNode)) {
									const nodeText = textNode.getTextContent()
									const nodeStart = currentIndex
									const nodeEnd = currentIndex + nodeText.length

									if (startIndex < nodeEnd && endIndex > nodeStart) {
										// 該当範囲にスタイルを適用
										textNode.setStyle(
											'background-color: #fef2f2; border-bottom: 2px solid #ef4444; color: #dc2626;',
										)
									}
									currentIndex = nodeEnd
								}
							})
							currentIndex++ // 改行文字分
						}
					})
				}
			}
		})
	}

	useEffect(() => {
		const checkText = () => {
			editor.getEditorState().read(() => {
				if (editor.isComposing() === true) {
					return
				}
				const root = $getRoot()
				const text = root.getTextContent()

				if (text.trim()) {
					worker.postMessage({ command: 'lint', text, ext: '.md' })
				}
			})
		}

		return editor.registerUpdateListener(() => {
			setTimeout(checkText, 500)
		})
	}, [editor])

	return null
}
