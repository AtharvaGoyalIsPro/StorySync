
'use server';
/**
 * @fileOverview AI flow for summarizing story content.
 *
 * - summarizeStory - A function that generates a summary of a given story.
 * - SummarizeStoryInput - The input type for the summarizeStory function.
 * - SummarizeStoryOutput - The return type for the summarizeStory function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const SummarizeStoryInputSchema = z.object({
  storyContent: z.string().min(50).describe('The full content of the story to be summarized. Must be at least 50 characters long.'),
  summaryLength: z.enum(['short', 'medium', 'long']).default('medium').describe('Desired length of the summary: "short" (1-2 sentences), "medium" (3-5 sentences), "long" (a paragraph).'),
});
export type SummarizeStoryInput = z.infer<typeof SummarizeStoryInputSchema>;

const SummarizeStoryOutputSchema = z.object({
  summary: z.string().describe('The AI-generated summary of the story.'),
});
export type SummarizeStoryOutput = z.infer<typeof SummarizeStoryOutputSchema>;

const summarizeStorySystemPrompt = `You are an expert summarizer. Your task is to read the provided story content and generate a concise and accurate summary.
The summary should capture the main plot points, key characters, and overall theme of the story.
The desired length of the summary is {{summaryLength}}.
- If 'short', provide a 1-2 sentence summary.
- If 'medium', provide a 3-5 sentence summary.
- If 'long', provide a paragraph-length summary (approximately 5-8 sentences).

Story Content to Summarize:
---
{{{storyContent}}}
---
`;

const summarizeStoryPrompt = ai.definePrompt({
  name: 'summarizeStoryPrompt',
  input: { schema: SummarizeStoryInputSchema },
  output: { schema: SummarizeStoryOutputSchema },
  prompt: summarizeStorySystemPrompt,
});

const summarizeStoryFlow = ai.defineFlow(
  {
    name: 'summarizeStoryFlow',
    inputSchema: SummarizeStoryInputSchema,
    outputSchema: SummarizeStoryOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeStoryPrompt(input);
    return output!;
  }
);

export async function summarizeStory(input: SummarizeStoryInput): Promise<SummarizeStoryOutput> {
  return summarizeStoryFlow(input);
}
