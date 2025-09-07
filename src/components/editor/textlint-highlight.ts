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
		const { message } = HTMLAttributes
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-textlint': '',
				class: 'group relative border-b border-red-300',
				title: message || '',
			}),
			0,
		]
	},
})
