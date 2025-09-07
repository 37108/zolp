import {
	defaultValueCtx,
	Editor as MilkdownEditor,
	rootCtx,
} from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { Milkdown, useEditor } from '@milkdown/react'
import { nord } from '@milkdown/theme-nord'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'
import '@milkdown/theme-nord/style.css'

const markdown = `# Milkdown React Commonmark

> You're scared of a world where you're needed.

This is a demo for using Milkdown with **React**.`

export const Editor = () => {
	useEditor((root) => {
		return MilkdownEditor.make()
			.config((ctx) => {
				ctx.set(rootCtx, root)
				ctx.set(defaultValueCtx, markdown)
				ctx.get(listenerCtx).updated((_ctx, doc) => {
					const text = doc.textContent || ''
					worker.postMessage({
						command: 'lint',
						text,
						ext: '.md',
					})
				})
			})
			.config(nord)
			.use(commonmark)
			.use(listener)
	})

	worker.onmessage = (event: TextLintMessageEvent) => {
		if (event.data.command === 'lint') {
			return
		}
		console.log(event.data.result.messages)
	}

	return (
		<div className="znc">
			<Milkdown />
		</div>
	)
}
