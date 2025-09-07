import { Mark, mergeAttributes } from '@tiptap/core'

export const TextlintHighlight = Mark.create({
	name: 'textlintHighlight',

	addAttributes() {
		return {
			message: {
				default: null,
			},
			ruleId: {
				default: null,
			},
		}
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-textlint]',
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-textlint': '',
				style: 'background-color: #fef2f2; border-bottom: 2px solid #ef4444;',
			}),
			0,
		]
	},
})