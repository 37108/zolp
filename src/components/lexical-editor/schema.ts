import z from 'zod'

export const TextLintMessageEvent = z.union([
	z.object({
		data: z.object({ command: z.literal('lint'), metadata: z.unknown() }),
	}),
	z.object({
		data: z.object({
			command: z.literal('lint:result'),
			result: z.object({
				filePath: z.string(),
				messages: z.array(
					z.object({
						type: z.enum(['lint']),
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
	}),
])
export type TextLintMessageEvent = z.infer<typeof TextLintMessageEvent>
