import {
	$applyNodeReplacement,
	DecoratorNode,
	type DOMConversionMap,
	type DOMExportOutput,
	type EditorConfig,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
} from 'lexical'
import type { JSX } from 'react'

export type SerializedTextlintErrorNode = Spread<
	{
		text: string
		message: string
		ruleId: string
	},
	SerializedLexicalNode
>

export class TextlintErrorNode extends DecoratorNode<JSX.Element> {
	__text: string
	__message: string
	__ruleId: string

	static getType(): string {
		return 'textlint-error'
	}

	static clone(node: TextlintErrorNode): TextlintErrorNode {
		return new TextlintErrorNode(
			node.__text,
			node.__message,
			node.__ruleId,
			node.__key,
		)
	}

	constructor(text: string, message: string, ruleId: string, key?: NodeKey) {
		super(key)
		this.__text = text
		this.__message = message
		this.__ruleId = ruleId
	}

	createDOM(_: EditorConfig): HTMLElement {
		const span = document.createElement('span')
		span.className = 'border-b border-red-500 text-red-500 border-dashed'
		span.title = this.__message
		return span
	}

	updateDOM(): false {
		return false
	}

	static importDOM(): DOMConversionMap | null {
		return {}
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement('span')
		element.textContent = this.__text
		return { element }
	}

	static importJSON(
		serializedNode: SerializedTextlintErrorNode,
	): TextlintErrorNode {
		const { text, message, ruleId } = serializedNode
		return $createTextlintErrorNode(text, message, ruleId)
	}

	exportJSON(): SerializedTextlintErrorNode {
		return {
			text: this.__text,
			message: this.__message,
			ruleId: this.__ruleId,
			type: 'textlint-error',
			version: 1,
		}
	}

	getTextContent(): string {
		return this.__text
	}

	decorate(): JSX.Element {
		return (
			<span title={this.__message} className="group relative">
				<span
					title={this.__message}
					className="border-b border-red-500 text-red-500 border-dashed"
				>
					{this.__text}
				</span>
			</span>
		)
	}

	isInline(): boolean {
		return true
	}
}

export function $createTextlintErrorNode(
	text: string,
	message: string,
	ruleId: string,
): TextlintErrorNode {
	return $applyNodeReplacement(new TextlintErrorNode(text, message, ruleId))
}

export function $isTextlintErrorNode(
	node: LexicalNode | null | undefined,
): node is TextlintErrorNode {
	return node instanceof TextlintErrorNode
}
