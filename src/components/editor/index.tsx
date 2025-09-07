import { Crepe } from '@milkdown/crepe'
import { Milkdown, useEditor } from '@milkdown/react'
// @ts-ignore
// import 'zenn-content-css'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import type { TextLintMessageEvent } from './schema'
import { worker } from './service-worker'

const markdown = `# 夕暮れの服を纏って
三日月の下に居座った

お寿司を食べれた。`

export const Editor = () => {
	useEditor((root) => {
		const crepe = new Crepe({
			root,
			defaultValue: markdown,
		})

		crepe.on((listener) => {
			listener.updated((_) => {
				worker.postMessage({
					command: 'lint',
					text: crepe.getMarkdown(),
					ext: '.md',
				})
			})
		})

		return crepe
	}, [])

	worker.onmessage = (event: TextLintMessageEvent) => {
		if (event.data.command === 'lint') {
			return
		}
		console.log(event.data.result.messages)
	}

	return <Milkdown />
}
