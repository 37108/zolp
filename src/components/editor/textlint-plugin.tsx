import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
	$createTextNode,
	$getRoot,
	$isElementNode,
	$isTextNode,
	createCommand,
	type LexicalCommand,
	type LexicalNode,
} from 'lexical'
import { useEffect, useState } from 'react'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'
import {
	$createTextlintErrorNode,
	$isTextlintErrorNode,
} from './textlint-error-node'

export const LINT_TEXT_COMMAND: LexicalCommand<string> = createCommand()

export const TextlintPlugin = () => {
	const [editor] = useLexicalComposerContext()
	const [previous, setPrevious] = useState('')

	worker.onmessage = (event: TextLintMessageEvent) => {
		editor.update(() => {
			if (event.data.command === 'lint:result') {
				const { messages } = event.data.result
				const root = $getRoot()

				// 既存のTextlintErrorNodeを削除
				root.getChildren().forEach((child) => {
					if ($isElementNode(child)) {
						const nodesToReplace: Array<{ node: LexicalNode; text: string }> =
							[]
						child.getChildren().forEach((node) => {
							if ($isTextlintErrorNode(node)) {
								nodesToReplace.push({ node, text: node.getTextContent() })
							}
						})
						nodesToReplace.forEach(({ node, text }) => {
							node.replace($createTextNode(text))
						})
					}
				})

				// エラー範囲をDecoratorノードで置換
				for (const message of messages) {
					const [startIndex, endIndex] = message.range

					let currentIndex = 0
					root.getChildren().forEach((paragraph) => {
						if ($isElementNode(paragraph)) {
							paragraph.getChildren().forEach((textNode) => {
								if ($isTextNode(textNode)) {
									const nodeText = textNode.getTextContent()
									const nodeStart = currentIndex
									const nodeEnd = currentIndex + nodeText.length

									if (startIndex < nodeEnd && endIndex > nodeStart) {
										const relativeStart = Math.max(0, startIndex - nodeStart)
										const relativeEnd = Math.min(
											nodeText.length,
											endIndex - nodeStart,
										)

										const beforeText = nodeText.slice(0, relativeStart)
										const errorPart = nodeText.slice(relativeStart, relativeEnd)
										const afterText = nodeText.slice(relativeEnd)

										if (errorPart) {
											const errorNode = $createTextlintErrorNode(
												errorPart,
												message.message,
												message.ruleId,
											)

											if (beforeText)
												textNode.insertBefore($createTextNode(beforeText))
											textNode.insertBefore(errorNode)
											if (afterText)
												textNode.insertBefore($createTextNode(afterText))
											textNode.remove()
										}
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

				if (text !== previous && text.trim()) {
					setPrevious(text)
					worker.postMessage({ command: 'lint', text, ext: '.md' })
				}
			})
		}

		return editor.registerUpdateListener(() => {
			setTimeout(checkText, 500)
		})
	}, [editor, previous])

	return null
}
