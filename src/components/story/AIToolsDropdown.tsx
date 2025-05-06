
'use client';

import type { Editor } from '@tiptap/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, Languages, VenetianMask, BookText, MessageSquareQuote, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

import { generateStoryPrompts, type GenerateStoryPromptsInput, type GenerateStoryPromptsOutput } from '@/ai/flows/generate-story-prompts-flow';
import { summarizeStory, type SummarizeStoryInput, type SummarizeStoryOutput } from '@/ai/flows/summarize-story-flow';
import { getWritingSuggestions, type GetWritingSuggestionsInput, type GetWritingSuggestionsOutput } from '@/ai/flows/get-writing-suggestions-flow';
import { paraphraseText, type ParaphraseTextInput, type ParaphraseTextOutput } from '@/ai/flows/paraphrase-text-flow';
import { expandText, type ExpandTextInput, type ExpandTextOutput } from '@/ai/flows/expand-text-flow';
import { translateStory, type TranslateStoryInput, type TranslateStoryOutput, type SupportedLanguage } from '@/ai/flows/translate-story-flow';
// Removed getDisplayLanguageName and SupportedLanguageSchema from translate-story-flow import as they are not directly exportable from 'use server'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface AIToolsDropdownProps {
  editor: Editor | null;
  storyId: string; // For context, not directly used in all AI features yet
  currentChapterContentForContext?: () => string; // Function to get current chapter content for context
  onApplySuggestion?: (suggestion: string) => void; // Callback to apply suggestion/text
}

type ParaphraseTone = ParaphraseTextInput['tone'];
type ExpansionStyle = ExpandTextInput['expansionStyle'];


// Define language names locally for the dropdown as 'use server' cannot export objects
const languageNames: Record<SupportedLanguage, string> = {
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
// Define supported languages locally for the dropdown
const supportedLanguagesArray: SupportedLanguage[] = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-CN', 'ru', 'ar', 'hi'
];


export default function AIToolsDropdown({ editor, onApplySuggestion, currentChapterContentForContext }: AIToolsDropdownProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null); // Tracks which AI tool is loading

  const [generatedPrompts, setGeneratedPrompts] = useState<GenerateStoryPromptsOutput['prompts']>([]);
  const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);

  const [summary, setSummary] = useState<string>('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const [writingSuggestions, setWritingSuggestions] = useState<GetWritingSuggestionsOutput['suggestions']>([]);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);

  const [paraphrasedTexts, setParaphrasedTexts] = useState<string[]>([]);
  const [isParaphraseModalOpen, setIsParaphraseModalOpen] = useState(false);
  const [selectedParaphraseTone, setSelectedParaphraseTone] = useState<ParaphraseTone>('neutral');
  const paraphraseTones: { value: ParaphraseTone, label: string }[] = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'formal', label: 'Formal' },
    { value: 'informal', label: 'Informal' },
    { value: 'simpler', label: 'Simpler' },
    { value: 'more_descriptive', label: 'More Descriptive' },
  ];

  const [expandedText, setExpandedText] = useState<string>('');
  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);
  const [selectedExpansionStyle, setSelectedExpansionStyle] = useState<ExpansionStyle>('add_detail');
  const expansionStyles: { value: ExpansionStyle, label: string }[] = [
      { value: 'add_detail', label: 'Add Detail'},
      { value: 'explain_further', label: 'Explain Further'},
      { value: 'continue_narrative', label: 'Continue Narrative'},
      { value: 'explore_implications', label: 'Explore Implications'},
  ];


  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('es'); // Default to Spanish

  const getSelectedText = (): string => {
    if (!editor || !editor.state.selection.content().size) {
      return '';
    }
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  };

  const getFullEditorContent = (): string => {
    return editor?.getHTML() || '';
  }

  const handleGeneratePrompts = async () => {
    setIsLoading('prompts');
    try {
      const input: GenerateStoryPromptsInput = {
        currentStoryContent: currentChapterContentForContext ? currentChapterContentForContext() : getFullEditorContent(),
        numPrompts: 3,
      };
      const result = await generateStoryPrompts(input);
      setGeneratedPrompts(result.prompts);
      setIsPromptsModalOpen(true);
    } catch (error: any) {
      toast({ title: 'Error Generating Prompts', description: error.message || 'Could not generate prompts.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  };

  const handleSummarizeStory = async (summaryLength: SummarizeStoryInput['summaryLength'] = 'medium') => {
    const content = getFullEditorContent();
    if (content.length < 50) {
      toast({ title: 'Content Too Short', description: 'Story content must be at least 50 characters to summarize.', variant: 'destructive' });
      return;
    }
    setIsLoading('summarize');
    try {
      const input: SummarizeStoryInput = { storyContent: content, summaryLength };
      const result = await summarizeStory(input);
      setSummary(result.summary);
      setIsSummaryModalOpen(true);
    } catch (error: any) {
      toast({ title: 'Error Summarizing Story', description: error.message || 'Could not summarize story.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  };

  const handleGetWritingSuggestions = async () => {
    const selectedText = getSelectedText();
    if (selectedText.length < 10) {
      toast({ title: 'Selection Too Short', description: 'Please select at least 10 characters for suggestions.', variant: 'destructive' });
      return;
    }
    setIsLoading('suggestions');
    try {
      const input: GetWritingSuggestionsInput = { textSelection: selectedText };
      const result = await getWritingSuggestions(input);
      setWritingSuggestions(result.suggestions);
      setIsSuggestionsModalOpen(true);
    } catch (error: any) {
      toast({ title: 'Error Getting Suggestions', description: error.message || 'Could not get writing suggestions.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  };

  const handleParaphraseText = async () => {
    const selectedText = getSelectedText();
    if (selectedText.length < 10) {
      toast({ title: 'Selection Too Short', description: 'Please select at least 10 characters to paraphrase.', variant: 'destructive' });
      return;
    }
    setIsLoading('paraphrase');
    try {
      const input: ParaphraseTextInput = { textToParaphrase: selectedText, tone: selectedParaphraseTone, numVariations: 2 };
      const result = await paraphraseText(input);
      setParaphrasedTexts(result.paraphrasedTexts);
      setIsParaphraseModalOpen(true);
    } catch (error: any) {
      toast({ title: 'Error Paraphrasing Text', description: error.message || 'Could not paraphrase text.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  };

  const handleExpandText = async () => {
    const selectedText = getSelectedText();
    if (selectedText.length < 5) {
      toast({ title: 'Selection Too Short', description: 'Please select at least 5 characters to expand.', variant: 'destructive' });
      return;
    }
    setIsLoading('expand');
    try {
      const input: ExpandTextInput = {
        textToExpand: selectedText,
        expansionStyle: selectedExpansionStyle,
        storyContext: currentChapterContentForContext ? currentChapterContentForContext() : getFullEditorContent(),
      };
      const result = await expandText(input);
      setExpandedText(result.expandedText);
      setIsExpandModalOpen(true);
    } catch (error: any) {
      toast({ title: 'Error Expanding Text', description: error.message || 'Could not expand text.', variant: 'destructive' });
    } finally {
      setIsLoading(null);
    }
  };

  const handleTranslateStory = async () => {
    const content = getFullEditorContent();
    if (!content.trim()) {
        toast({ title: 'No Content', description: 'Editor content is empty, cannot translate.', variant: 'destructive' });
        return;
    }
    setIsLoading('translate');
    try {
        const input: TranslateStoryInput = { storyContent: content, targetLanguage };
        const result = await translateStory(input);
        setTranslatedText(result.translatedContent);
        setIsTranslateModalOpen(true);
    } catch (error: any) {
        toast({ title: 'Error Translating Story', description: error.message || 'Could not translate story.', variant: 'destructive' });
    } finally {
        setIsLoading(null);
    }
  };


  const applyToEditor = (text: string) => {
    if (editor && onApplySuggestion) {
        // If there's a selection, replace it. Otherwise, insert at cursor.
        if (editor.state.selection.empty) {
            editor.chain().focus().insertContent(text).run();
        } else {
            editor.chain().focus().deleteSelection().insertContent(text).run();
        }
        onApplySuggestion(text); // This might trigger a save or just update state
    } else {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied to Clipboard', description: 'Could not apply directly to editor.' });
    }
  };


  const availableLanguagesForDropdown = supportedLanguagesArray.map(code => ({ code, name: languageNames[code] }));


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!!isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            AI Tools
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>Story Assistance</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleGeneratePrompts} disabled={isLoading === 'prompts'}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Generate Story Prompts</span>
            {isLoading === 'prompts' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isLoading === 'summarize'}>
                <BookText className="mr-2 h-4 w-4" />
                <span>Summarize Story</span>
                {isLoading === 'summarize' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleSummarizeStory('short')}>Short (1-2 sentences)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSummarizeStory('medium')}>Medium (3-5 sentences)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSummarizeStory('long')}>Long (paragraph)</DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>


          <DropdownMenuSeparator />
          <DropdownMenuLabel>Writing Aids</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleGetWritingSuggestions} disabled={isLoading === 'suggestions' || !editor?.state.selection.content().size}>
            <MessageSquareQuote className="mr-2 h-4 w-4" />
            <span>Grammar & Style</span>
            {isLoading === 'suggestions' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
          </DropdownMenuItem>

           <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isLoading === 'paraphrase' || !editor?.state.selection.content().size}>
              <VenetianMask className="mr-2 h-4 w-4" />
              <span>Paraphrase Selection</span>
              {isLoading === 'paraphrase' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuLabel>Choose Tone</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={selectedParaphraseTone} onValueChange={(value) => setSelectedParaphraseTone(value as ParaphraseTone)}>
                        {paraphraseTones.map(tone => (
                            <DropdownMenuRadioItem key={tone.value} value={tone.value} onClick={handleParaphraseText}>
                                {tone.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isLoading === 'expand' || !editor?.state.selection.content().size}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Expand Selection</span>
              {isLoading === 'expand' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuLabel>Choose Style</DropdownMenuLabel>
                     <DropdownMenuRadioGroup value={selectedExpansionStyle} onValueChange={(value) => setSelectedExpansionStyle(value as ExpansionStyle)}>
                        {expansionStyles.map(style => (
                            <DropdownMenuRadioItem key={style.value} value={style.value} onClick={handleExpandText}>
                                {style.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>


          <DropdownMenuSeparator />
          <DropdownMenuLabel>Content Tools</DropdownMenuLabel>
           <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isLoading === 'translate'}>
                <Languages className="mr-2 h-4 w-4" />
                <span>Translate Story</span>
                {isLoading === 'translate' && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                    <DropdownMenuLabel>Target Language</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={targetLanguage} onValueChange={(value) => { setTargetLanguage(value as SupportedLanguage); handleTranslateStory(); }}>
                        {availableLanguagesForDropdown.map(lang => (
                            <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                                {lang.name}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal for Story Prompts */}
      <Dialog open={isPromptsModalOpen} onOpenChange={setIsPromptsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generated Story Prompts</DialogTitle>
            <DialogDescription>Choose a prompt to get started or copy it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {generatedPrompts.map((prompt, index) => (
              <div key={index} className="p-3 border rounded-md">
                <h4 className="font-semibold mb-1">{prompt.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{prompt.description}</p>
                <Button variant="outline" size="sm" onClick={() => applyToEditor(`${prompt.title}\n\n${prompt.description}`)}>Use this prompt</Button>
              </div>
            ))}
            {generatedPrompts.length === 0 && <p className="text-muted-foreground">No prompts generated.</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPromptsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal for Story Summary */}
      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Story Summary</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <Textarea value={summary} readOnly rows={10} className="bg-muted" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(summary); toast({title: "Summary Copied"}); }}>Copy Summary</Button>
            <Button variant="secondary" onClick={() => setIsSummaryModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal for Writing Suggestions */}
        <Dialog open={isSuggestionsModalOpen} onOpenChange={setIsSuggestionsModalOpen}>
            <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Writing Suggestions</DialogTitle>
                <DialogDescription>Review these suggestions for your selected text.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                {writingSuggestions.length > 0 ? writingSuggestions.map((sugg, index) => (
                <div key={index} className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground">Original: "{sugg.originalSegment}"</p>
                    <p className="text-sm font-medium capitalize mt-1">{sugg.suggestionType}</p>
                    <p className="text-sm my-1">{sugg.message}</p>
                    {sugg.suggestedFix && (
                    <>
                        <p className="text-sm text-green-600 dark:text-green-400">Suggestion: "{sugg.suggestedFix}"</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => applyToEditor(sugg.suggestedFix!)}>Apply Fix</Button>
                    </>
                    )}
                </div>
                )) : <p className="text-muted-foreground">No specific suggestions found for the selected text.</p>}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsSuggestionsModalOpen(false)}>Close</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal for Paraphrased Text */}
        <Dialog open={isParaphraseModalOpen} onOpenChange={setIsParaphraseModalOpen}>
            <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Paraphrased Variations</DialogTitle>
                <DialogDescription>Choose a variation to apply or copy.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
                {paraphrasedTexts.map((text, index) => (
                <div key={index} className="p-3 border rounded-md">
                    <p className="text-sm mb-2">{text}</p>
                    <Button variant="outline" size="sm" onClick={() => applyToEditor(text)}>Apply This Version</Button>
                </div>
                ))}
                {paraphrasedTexts.length === 0 && <p className="text-muted-foreground">Could not generate paraphrased versions.</p>}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsParaphraseModalOpen(false)}>Close</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal for Expanded Text */}
        <Dialog open={isExpandModalOpen} onOpenChange={setIsExpandModalOpen}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Expanded Text</DialogTitle>
                <DialogDescription>Review the expanded version of your selection.</DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto">
                <Textarea value={expandedText} readOnly rows={8} className="bg-muted" />
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
                <Button variant="default" onClick={() => { applyToEditor(expandedText); setIsExpandModalOpen(false); }}>Apply Expansion</Button>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(expandedText); toast({title: "Expanded Text Copied"}); }}>Copy Text</Button>
                <Button variant="secondary" onClick={() => setIsExpandModalOpen(false)}>Close</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal for Translated Story */}
        <Dialog open={isTranslateModalOpen} onOpenChange={setIsTranslateModalOpen}>
            <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Translated Story ({languageNames[targetLanguage]})</DialogTitle>
                <DialogDescription>The story content has been translated.</DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto">
                <Textarea value={translatedText} readOnly rows={15} className="bg-muted" />
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
                 <Button variant="outline" onClick={() => { navigator.clipboard.writeText(translatedText); toast({title: "Translated Text Copied"}); }}>Copy Translation</Button>
                <Button variant="secondary" onClick={() => setIsTranslateModalOpen(false)}>Close</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

    </>
  );
}
