
'use server';
/**
 * @fileOverview AI flow for expanding on a selected piece of text.
 *
 * - expandText - A function that generates an expanded version of the given text.
 * - ExpandTextInput - The input type for the expandText function.
 * - ExpandTextOutput - The return type for the expandText function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const ExpandTextInputSchema = z.object({
  textToExpand: z.string().min(5).describe('The short text or sentence to expand upon. Must be at least 5 characters long.'),
  expansionStyle: z.enum(['add_detail', 'explain_further', 'continue_narrative', 'explore_implications']).default('add_detail').describe('The style of expansion: "add_detail" (flesh out with more specifics), "explain_further" (clarify or elaborate on the concept), "continue_narrative" (write the next few sentences if it\'s a story segment), "explore_implications" (discuss potential consequences or related ideas).'),
  desiredLength: z.enum(['short_paragraph', 'medium_paragraph']).default('short_paragraph').describe('Desired length of the expansion: "short_paragraph" (2-3 sentences), "medium_paragraph" (4-6 sentences).'),
  storyContext: z.string().optional().describe('Optional surrounding text or context from the story to help guide the expansion and maintain consistency.'),
});
export type ExpandTextInput = z.infer<typeof ExpandTextInputSchema>;

const ExpandTextOutputSchema = z.object({
  expandedText: z.string().describe('The AI-generated expanded version of the input text.'),
});
export type ExpandTextOutput = z.infer<typeof ExpandTextOutputSchema>;

const expandTextSystemPrompt = `You are an AI writing assistant skilled at expanding upon given text.
Your goal is to take a short piece of text and elaborate on it according to the specified style and length.

Text to Expand:
---
{{{textToExpand}}}
---

Expansion Style: {{expansionStyle}}
- If 'add_detail': Flesh out the text with more specific details, descriptions, or examples.
- If 'explain_further': Clarify the meaning of the text, elaborate on its concepts, or provide background information.
- If 'continue_narrative': If the text is a story segment, write the next few sentences to continue the narrative flow.
- If 'explore_implications': Discuss potential consequences, outcomes, or related ideas stemming from the text.

Desired Length: {{desiredLength}}
- If 'short_paragraph': Generate an expansion of about 2-3 sentences.
- If 'medium_paragraph': Generate an expansion of about 4-6 sentences.

{{#if storyContext}}
Consider the following surrounding story context to ensure the expansion is consistent:
--- Story Context ---
{{{storyContext}}}
--- End Story Context ---
{{/if}}

Generate only the expanded text itself, building upon the provided "Text to Expand".
`;

const expandTextPrompt = ai.definePrompt({
  name: 'expandTextPrompt',
  input: { schema: ExpandTextInputSchema },
  output: { schema: ExpandTextOutputSchema },
  prompt: expandTextSystemPrompt,
});

const expandTextFlow = ai.defineFlow(
  {
    name: 'expandTextFlow',
    inputSchema: ExpandTextInputSchema,
    outputSchema: ExpandTextOutputSchema,
  },
  async (input) => {
    const { output } = await expandTextPrompt(input);
    return output!;
  }
);

export async function expandText(input: ExpandTextInput): Promise<ExpandTextOutput> {
  return expandTextFlow(input);
}
