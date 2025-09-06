import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	COMMAND_PRIORITY_NORMAL,
	createCommand,
	type LexicalCommand,
} from "lexical";
import { useEffect } from "react";
import z from "zod";
import textlintWorker from "/textlint-worker.js?url";

const TextLintMessageEvent = z.object({
	data: z.object({
		command: z.enum(["lint:result"]),
		result: z.object({
			filePath: z.string(),
			messages: z.array(
				z.object({
					type: z.enum(["lint"]),
					ruleId: z.string(),
					message: z.string(),
					severity: z.number(),
					column: z.number(),
					index: z.number(),
					line: z.number(),
					loc: z.object({
						end: z.object({ line: z.number(), column: z.number }),
						start: z.object({ line: z.number(), column: z.number }),
					}),
					range: z.array(z.number()),
				}),
			),
		}),
	}),
});
type TextLintMessageEvent = z.infer<typeof TextLintMessageEvent>;

const worker = new Worker(textlintWorker);

export const LINT_TEXT_COMMAND: LexicalCommand<string> = createCommand();

export const TextlintPlugin = () => {
	const [editor] = useLexicalComposerContext();

	worker.onmessage = (event: TextLintMessageEvent) => {
		console.log(event);
		editor.update(() => {
			if (event.data.command === "lint:result") {
				const { messages } = event.data.result;

				for (const message of messages) {
					const root = $getRoot();
					const paragraphNode = $createParagraphNode();
					const textNode = $createTextNode(message.message);
				}
			}
		});
	};

	useEffect(() => {
		const checkText = () => {
			editor.getEditorState().read(() => {
				const root = $getRoot();
				const text = root.getTextContent();

				if (text.trim()) {
					worker.postMessage({ command: "lint", text, ext: ".md" });
				}
			});
		};
		editor.registerCommand(
			LINT_TEXT_COMMAND,
			(payload) => {
				return true;
			},
			COMMAND_PRIORITY_NORMAL,
		);

		return editor.registerUpdateListener(() => {
			setTimeout(checkText, 500);
		});
	}, [editor]);

	return null;
};
