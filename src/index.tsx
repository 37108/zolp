import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { Editor } from './components/editor'

const container = document.getElementById('root')
if (!container) throw new Error('Failed to find the root element')

if (import.meta.env.PROD) {
	createRoot(container).render(
		<StrictMode>
			<Editor />
		</StrictMode>,
	)
} else {
	createRoot(container).render(
		<StrictMode>
			<Editor />
		</StrictMode>,
	)
}
