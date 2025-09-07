import textlintWorker from '/textlint-worker.js?url'

export const worker = new Worker(textlintWorker)
