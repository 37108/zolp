import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useMemo, useState } from 'react'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'
import { TextlintHighlight } from './textlint-highlight'

export const Editor = () => {
	const [previous, setPrevious] = useState('')
	const [isComposing, setIsComposing] = useState(false)

	const editor = useEditor({
		extensions: [StarterKit, TextlintHighlight],
		content: '<p>本文を入力してください</p>',
		editorProps: {
			attributes: {
				class:
					'znc outline-none p-4 border border-gray-300 rounded-md min-h-[200px] leading-relaxed',
			},
		},
		onUpdate: ({ editor }) => {
			if (isComposing) return

			const text = editor.getText()
			if (text !== previous && text.trim()) {
				setPrevious(text)
				setTimeout(() => {
					if (!isComposing) {
						worker.postMessage({ command: 'lint', text, ext: '.md' })
					}
				}, 500)
			}
		},
	})

	useEffect(() => {
		if (!editor) return

		const editorElement = editor.view.dom
		const handleCompositionStart = () => setIsComposing(true)
		const handleCompositionEnd = () => setIsComposing(false)

		editorElement.addEventListener('compositionstart', handleCompositionStart)
		editorElement.addEventListener('compositionend', handleCompositionEnd)

		return () => {
			editorElement.removeEventListener(
				'compositionstart',
				handleCompositionStart,
			)
			editorElement.removeEventListener('compositionend', handleCompositionEnd)
		}
	}, [editor])

	useEffect(() => {
		worker.onmessage = (event: TextLintMessageEvent) => {
			if (event.data.command === 'lint:result' && editor) {
				const { messages } = event.data.result

				// カーソル位置を保存
				const currentSelection = editor.state.selection

				// 既存のハイライトを削除
				editor.commands.unsetMark('textlintHighlight')

				// エラー箇所をハイライト
				for (const message of messages) {
					const [start, end] = message.range
					editor.commands.setTextSelection({ from: start + 1, to: end + 1 })
					editor.commands.setMark('textlintHighlight', {
						message: message.message,
						ruleId: message.ruleId,
					})
				}

				// カーソル位置を復元
				editor.commands.setTextSelection(currentSelection)
			}
		}
	}, [editor])

	const stylingButtons = useMemo(
		() => [
			{
				label: '通常',
				action: () => editor.chain().focus().setParagraph().run(),
				canExecute: () => true,
				isActive: () => editor.isActive('paragraph'),
			},
			{
				label: '見出し2',
				action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
				canExecute: () => true,
				isActive: () => editor.isActive('heading', { level: 2 }),
			},
			{
				label: '見出し3',
				action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
				canExecute: () => true,
				isActive: () => editor.isActive('heading', { level: 3 }),
			},
			{
				label: '太字',
				action: () => editor.chain().focus().toggleBold().run(),
				canExecute: () => editor.can().chain().focus().toggleBold().run(),
				isActive: () => editor.isActive('bold'),
			},
			{
				label: '斜体',
				action: () => editor.chain().focus().toggleItalic().run(),
				canExecute: () => editor.can().chain().focus().toggleItalic().run(),
				isActive: () => editor.isActive('italic'),
			},
			{
				label: '取り消し線',
				action: () => editor.chain().focus().toggleStrike().run(),
				canExecute: () => editor.can().chain().focus().toggleStrike().run(),
				isActive: () => editor.isActive('strike'),
			},
			{
				label: 'コード',
				action: () => editor.chain().focus().toggleCode().run(),
				canExecute: () => editor.can().chain().focus().toggleCode().run(),
				isActive: () => editor.isActive('code'),
			},
			{
				label: '箇条書き',
				action: () => editor.chain().focus().toggleBulletList().run(),
				canExecute: () => true,
				isActive: () => editor.isActive('bulletList'),
			},
			{
				label: '番号付きリスト',
				action: () => editor.chain().focus().toggleOrderedList().run(),
				canExecute: () => true,
				isActive: () => editor.isActive('orderedList'),
			},
			{
				label: '装飾解除',
				action: () => editor.chain().focus().unsetAllMarks().run(),
				canExecute: () => true,
				isActive: () => false,
			},
			{
				label: '書式解除',
				action: () => editor.chain().focus().clearNodes().run(),
				canExecute: () => true,
				isActive: () => false,
			},
			{
				label: 'コードブロック',
				action: () => editor.chain().focus().toggleCodeBlock().run(),
				canExecute: () => true,
				isActive: () => editor.isActive('codeBlock'),
			},
			{
				label: '引用',
				action: () => editor.chain().focus().toggleBlockquote().run(),
				canExecute: () => true,
				isActive: () => editor.isActive('blockquote'),
			},
		],
		[editor],
	)

	const actionButtons = useMemo(
		() => [
			{
				label: '区切り線',
				action: () => editor.chain().focus().setHorizontalRule().run(),
				canExecute: () => true,
			},
			{
				label: '改行',
				action: () => editor.chain().focus().setHardBreak().run(),
				canExecute: () => true,
			},
			{
				label: '元に戻す',
				action: () => editor.chain().focus().undo().run(),
				canExecute: () => editor.can().chain().focus().undo().run(),
			},
			{
				label: 'やり直し',
				action: () => editor.chain().focus().redo().run(),
				canExecute: () => editor.can().chain().focus().redo().run(),
			},
		],
		[editor],
	)

	if (!editor) {
		return null
	}

	return (
		<div className="max-w-4xl mx-auto">
			<div className="flex flex-wrap gap-1 mb-4 p-2 border border-gray-300 rounded-md bg-gray-50">
				{stylingButtons.map((button) => (
					<button
						key={button.label}
						type="button"
						onClick={button.action}
						disabled={!button.canExecute()}
						className="px-3 py-1.5 border border-gray-300 rounded text-sm cursor-pointer transition-all duration-150 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{button.label}
					</button>
				))}
				{actionButtons.map((button) => (
					<button
						key={button.label}
						type="button"
						onClick={button.action}
						disabled={!button.canExecute()}
						className="px-3 py-1.5 border border-gray-300 rounded text-sm cursor-pointer transition-all duration-150 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{button.label}
					</button>
				))}
			</div>

			<EditorContent editor={editor} />
		</div>
	)
}
