
'use server';
/**
 * @fileOverview AI flow for providing writing suggestions (grammar, style, clarity, etc.).
 *
 * - getWritingSuggestions - A function that analyzes text and provides writing suggestions.
 * - GetWritingSuggestionsInput - The input type for the getWritingSuggestions function.
 * - GetWritingSuggestionsOutput - The return type for the getWritingSuggestions function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GetWritingSuggestionsInputSchema = z.object({
  textSelection: z.string().min(10).describe('The selected text to analyze for grammar, style, and other writing improvements. Must be at least 10 characters long.'),
});
export type GetWritingSuggestionsInput = z.infer<typeof GetWritingSuggestionsInputSchema>;

const WritingSuggestionSchema = z.object({
  originalSegment: z.string().describe('The specific part of the input text the suggestion applies to.'),
  suggestionType: z.enum(['grammar', 'style', 'clarity', 'conciseness', 'tone', 'vocabulary', 'punctuation']).describe('The type of writing suggestion offered.'),
  message: z.string().describe('A clear explanation of the potential issue and the reasoning behind the suggestion.'),
  suggestedFix: z.string().optional().describe('The suggested corrected or improved text, if applicable. This might not always be present, especially for more nuanced style suggestions.'),
});

const GetWritingSuggestionsOutputSchema = z.object({
  suggestions: z.array(WritingSuggestionSchema).describe('An array of writing suggestions for the provided text.'),
});
export type GetWritingSuggestionsOutput = z.infer<typeof GetWritingSuggestionsOutputSchema>;

const writingSuggestionsSystemPrompt = `You are an expert writing assistant and editor.
Analyze the following text selection for potential improvements in grammar, style, clarity, conciseness, tone, vocabulary, and punctuation.
For each identified issue, provide the original segment of text, the type of suggestion, a clear message explaining the issue and the reasoning for the suggestion, and if applicable, a suggested fix.
If no issues are found, return an empty array of suggestions.

Text Selection to Analyze:
---
{{{textSelection}}}
---
`;

const getWritingSuggestionsPrompt = ai.definePrompt({
  name: 'getWritingSuggestionsPrompt',
  input: { schema: GetWritingSuggestionsInputSchema },
  output: { schema: GetWritingSuggestionsOutputSchema },
  prompt: writingSuggestionsSystemPrompt,
});

const getWritingSuggestionsFlow = ai.defineFlow(
  {
    name: 'getWritingSuggestionsFlow',
    inputSchema: GetWritingSuggestionsInputSchema,
    outputSchema: GetWritingSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await getWritingSuggestionsPrompt(input);
    // Ensure suggestions always returns an array, even if the model might return null/undefined by mistake
    return { suggestions: output?.suggestions || [] };
  }
);

export async function getWritingSuggestions(input: GetWritingSuggestionsInput): Promise<GetWritingSuggestionsOutput> {
  return getWritingSuggestionsFlow(input);
}
