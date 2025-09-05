import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { useEffect } from "react";
import textlintWorker from '/textlint-worker.js?url';

const worker = new Worker(textlintWorker)

export const TextlintPlugin =() => {
	const [editor] = useLexicalComposerContext();
	worker.onmessage = (event) => {console.log(event)}

	useEffect(() => {
		const checkText = () => {
			editor.getEditorState().read(() => {
				const root = $getRoot();
				const text = root.getTextContent();

				if (text.trim()) {
					worker.postMessage({command: 'lint', text, ext: '.md'})
				}
			});
		};

		return editor.registerUpdateListener(() => {
			setTimeout(checkText, 500);
		});
	}, [editor]);

	return null
}
