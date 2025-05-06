
'use server';
/**
 * @fileOverview AI flow for translating story content into different languages.
 *
 * - translateStory - A function that translates the given story content.
 * - TranslateStoryInput - The input type for the translateStory function.
 * - TranslateStoryOutput - The return type for the translateStory function.
 * - SupportedLanguage - Type for supported language codes.
 * - getDisplayLanguageName - Function to get the display name of a language code.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// A selection of common languages. This can be expanded.
const SupportedLanguageSchemaInternal = z.enum([
  'en', // English
  'es', // Spanish
  'fr', // French
  'de', // German
  'it', // Italian
  'pt', // Portuguese
  'ja', // Japanese
  'ko', // Korean
  'zh-CN', // Chinese (Simplified)
  'ru', // Russian
  'ar', // Arabic
  'hi', // Hindi
]);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchemaInternal>;

const TranslateStoryInputSchema = z.object({
  storyContent: z.string().min(1).describe('The content of the story to be translated.'),
  targetLanguage: SupportedLanguageSchemaInternal.describe('The language code to translate the story into (e.g., "es" for Spanish, "fr" for French).'),
  sourceLanguage: SupportedLanguageSchemaInternal.optional().describe('Optional: The language code of the original story content. If not provided, the AI will attempt to detect it.'),
});
export type TranslateStoryInput = z.infer<typeof TranslateStoryInputSchema>;

const TranslateStoryOutputSchema = z.object({
  translatedContent: z.string().describe('The story content translated into the target language.'),
  detectedSourceLanguage: SupportedLanguageSchemaInternal.optional().describe('The language code of the source text if it was auto-detected.'),
});
export type TranslateStoryOutput = z.infer<typeof TranslateStoryOutputSchema>;

const translateStorySystemPrompt = `You are a highly proficient multilingual translator specializing in literary content.
Your task is to translate the provided story content accurately and fluently into the target language, while preserving the original tone, style, and nuances.

Target Language: {{targetLanguage}}
{{#if sourceLanguage}}Source Language: {{sourceLanguage}}{{else}}Source Language: Autodetect{{/if}}

Story Content to Translate:
---
{{{storyContent}}}
---

Provide only the translated text. If you auto-detect the source language, indicate it in the designated output field.
`;

const translateStoryPrompt = ai.definePrompt({
  name: 'translateStoryPrompt',
  input: { schema: TranslateStoryInputSchema },
  output: { schema: TranslateStoryOutputSchema },
  prompt: translateStorySystemPrompt,
});

const translateStoryFlow = ai.defineFlow(
  {
    name: 'translateStoryFlow',
    inputSchema: TranslateStoryInputSchema,
    outputSchema: TranslateStoryOutputSchema,
  },
  async (input) => {
    // For simplicity, we're not implementing separate auto-detection logic here.
    // The model itself is usually good at handling unspecified source languages.
    // The `detectedSourceLanguage` field is more for indicating if the model *could* provide this.
    const { output } = await translateStoryPrompt(input);
    
    // If sourceLanguage was not provided in input and the model could fill detectedSourceLanguage,
    // it would be in `output.detectedSourceLanguage`.
    // We assume the model handles the translation correctly even without explicit source language.
    return output!;
  }
);

export async function translateStory(input: TranslateStoryInput): Promise<TranslateStoryOutput> {
  return translateStoryFlow(input);
}

// This map is internal and not exported directly.
const internalLanguageNames: Record<SupportedLanguage, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh-CN': 'Chinese (Simplified)',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
};

// Export a function to get the language name if needed by client components,
// but the map itself is not exported.
export async function getDisplayLanguageName(langCode: SupportedLanguage): Promise<string> {
    return internalLanguageNames[langCode] || langCode;
}

// Client components should import this type and function if needed.
// For the AIToolsDropdown, it might be better to define the language list on the client-side
// or fetch it if it becomes dynamic.
