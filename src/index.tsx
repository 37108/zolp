import { MilkdownProvider } from '@milkdown/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from './components/editor'
import './style.css'

const container = document.getElementById('root')
if (!container) throw new Error('Failed to find the root element')

if (import.meta.env.PROD) {
	createRoot(container).render(
		<StrictMode>
			<MilkdownProvider>
				<div>
					<Editor />
				</div>
			</MilkdownProvider>
		</StrictMode>,
	)
} else {
	createRoot(container).render(
		<StrictMode>
			<MilkdownProvider>
				<div className="mx-auto mt-10 max-w-3xl">
					<Editor />
				</div>
			</MilkdownProvider>
		</StrictMode>,
	)
}
