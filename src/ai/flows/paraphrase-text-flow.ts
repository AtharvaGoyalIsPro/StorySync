
'use server';
/**
 * @fileOverview AI flow for paraphrasing selected text.
 *
 * - paraphraseText - A function that provides paraphrased versions of a given text.
 * - ParaphraseTextInput - The input type for the paraphraseText function.
 * - ParaphraseTextOutput - The return type for the paraphraseText function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const ParaphraseTextInputSchema = z.object({
  textToParaphrase: z.string().min(10).describe('The text selection to be paraphrased. Must be at least 10 characters long.'),
  tone: z.enum(['neutral', 'formal', 'informal', 'simpler', 'more_descriptive']).default('neutral').describe('The desired tone for the paraphrased text. "simpler" aims for easier understanding, "more_descriptive" aims for richer language.'),
  numVariations: z.number().int().min(1).max(3).default(2).describe('The number of paraphrased variations to generate.'),
});
export type ParaphraseTextInput = z.infer<typeof ParaphraseTextInputSchema>;

const ParaphraseTextOutputSchema = z.object({
  paraphrasedTexts: z.array(z.string()).describe('An array of paraphrased versions of the input text, matching the requested tone and number of variations.'),
});
export type ParaphraseTextOutput = z.infer<typeof ParaphraseTextOutputSchema>;

const paraphraseTextSystemPrompt = `You are a skilled rephrasing tool. Your task is to paraphrase the given text selection.
Generate {{numVariations}} different paraphrased versions of the text.
The desired tone for the paraphrased text is {{tone}}.
- 'neutral': Maintain a balanced and objective tone.
- 'formal': Use more sophisticated vocabulary and sentence structures.
- 'informal': Use a more casual and conversational style.
- 'simpler': Rephrase the text to be easier to understand, using simpler words and shorter sentences.
- 'more_descriptive': Enhance the text with richer vocabulary and more vivid descriptions, while retaining the original meaning.

Ensure each variation significantly rephrases the original text while preserving its core meaning. Avoid simply rearranging words; aim for genuine re-expression.

Original Text to Paraphrase:
---
{{{textToParaphrase}}}
---
`;

const paraphraseTextPrompt = ai.definePrompt({
  name: 'paraphraseTextPrompt',
  input: { schema: ParaphraseTextInputSchema },
  output: { schema: ParaphraseTextOutputSchema },
  prompt: paraphraseTextSystemPrompt,
});

const paraphraseTextFlow = ai.defineFlow(
  {
    name: 'paraphraseTextFlow',
    inputSchema: ParaphraseTextInputSchema,
    outputSchema: ParaphraseTextOutputSchema,
  },
  async (input) => {
    const { output } = await paraphraseTextPrompt(input);
    return output!;
  }
);

export async function paraphraseText(input: ParaphraseTextInput): Promise<ParaphraseTextOutput> {
  return paraphraseTextFlow(input);
}
