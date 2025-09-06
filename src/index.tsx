import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Editor } from './components/editor'
import './style.css'
//@ts-ignore
import 'zenn-content-css'

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
