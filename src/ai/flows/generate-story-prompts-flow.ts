
'use server';
/**
 * @fileOverview AI flow for generating story prompts.
 *
 * - generateStoryPrompts - A function that generates story ideas or prompts.
 * - GenerateStoryPromptsInput - The input type for the generateStoryPrompts function.
 * - GenerateStoryPromptsOutput - The return type for the generateStoryPrompts function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const GenerateStoryPromptsInputSchema = z.object({
  currentStoryContent: z.string().optional().describe('Optional existing content of the story to adapt prompts to. If provided, prompts should try to build upon or relate to this content.'),
  genre: z.string().optional().describe('Optional genre to focus the prompts on (e.g., fantasy, sci-fi, romance, mystery, horror).'),
  numPrompts: z.number().int().min(1).max(5).default(3).describe('Number of prompts to generate.'),
});
export type GenerateStoryPromptsInput = z.infer<typeof GenerateStoryPromptsInputSchema>;

const GenerateStoryPromptsOutputSchema = z.object({
  prompts: z.array(z.object({
    title: z.string().describe('A catchy title or main idea for the story prompt.'),
    description: z.string().describe('A brief (2-3 sentences) description or starting point for the story prompt, outlining a potential conflict, character, or setting.'),
  })).describe('An array of generated story prompts.'),
});
export type GenerateStoryPromptsOutput = z.infer<typeof GenerateStoryPromptsOutputSchema>;

const storyPromptsSystemPrompt = `You are a creative assistant specialized in generating compelling story prompts.
Your goal is to help users overcome writer's block by providing imaginative and diverse ideas.
Generate a list of {{numPrompts}} story prompts.
{{#if genre}}Focus on the {{genre}} genre.{{/if}}
{{#if currentStoryContent}}
Consider the following existing story content and try to generate prompts that could be continuations, alternative paths, prequels, sequels, or related themes:
--- Current Story Content ---
{{{currentStoryContent}}}
--- End Current Story Content ---
{{else}}
Generate fresh and original ideas.
{{/if}}
Each prompt should have a clear title and a short description.
Ensure the prompts are varied and offer different creative directions.
`;

const generateStoryPromptsPrompt = ai.definePrompt({
  name: 'generateStoryPromptsPrompt',
  input: { schema: GenerateStoryPromptsInputSchema },
  output: { schema: GenerateStoryPromptsOutputSchema },
  prompt: storyPromptsSystemPrompt,
});

const generateStoryPromptsFlow = ai.defineFlow(
  {
    name: 'generateStoryPromptsFlow',
    inputSchema: GenerateStoryPromptsInputSchema,
    outputSchema: GenerateStoryPromptsOutputSchema,
  },
  async (input) => {
    const { output } = await generateStoryPromptsPrompt(input);
    if (!output) {
 throw new Error('Failed to generate story prompts from AI model.');
    }
    return output;
  }
);

export async function generateStoryPrompts(input: GenerateStoryPromptsInput): Promise<GenerateStoryPromptsOutput | null> {
  try {
 return await generateStoryPromptsFlow(input);
  } catch (error) {
    console.error('Error in generateStoryPrompts flow:', error);
 return null;
  }
}
