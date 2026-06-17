import { useState, useCallback, useEffect, memo } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export type TaskType =
  | 'code-review'
  | 'debug'
  | 'creative-writing'
  | 'brainstorm'
  | 'analysis'
  | 'learning'
  | 'data-extraction'
  | 'summarization';

const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { value: 'code-review', label: 'Code Review', description: 'Get thorough feedback on your code' },
  { value: 'debug', label: 'Debug', description: 'Solve a tricky bug or error' },
  { value: 'creative-writing', label: 'Creative Writing', description: 'Write stories, emails, copy, etc.' },
  { value: 'brainstorm', label: 'Brainstorm', description: 'Generate and explore ideas' },
  { value: 'analysis', label: 'Analysis', description: 'Deep-dive into data or documents' },
  { value: 'learning', label: 'Learning', description: 'Understand a new topic or skill' },
  { value: 'data-extraction', label: 'Data Extraction', description: 'Pull structured data from text' },
  { value: 'summarization', label: 'Summarization', description: 'Condense long content into key points' },
];

interface TaskFields {
  // Shared
  topic?: string;
  // code-review
  code?: string;
  language?: string;
  concerns?: string;
  // debug
  problem?: string;
  errorMessage?: string;
  attempted?: string;
  // creative-writing
  writingType?: string;
  tone?: string;
  audience?: string;
  keyPoints?: string;
  // brainstorm
  goal?: string;
  constraints?: string;
  count?: string;
  // analysis
  material?: string;
  framework?: string;
  depth?: string;
  // learning
  currentLevel?: string;
  style?: string;
  goals?: string;
  // data-extraction
  schema?: string;
  source?: string;
  // summarization
  sourceMaterial?: string;
  length?: string;
  focus?: string;
}

const PROMPT_TEMPLATES: Record<TaskType, (f: TaskFields) => string> = {
  'code-review': (f) => `You are an expert software engineer conducting a thorough code review.

## Code to Review
${f.code || '<paste your code here>'}

## Language / Framework
${f.language || 'Not specified'}

## Specific Concerns (optional)
${f.concerns || 'None — do a general review'}

## Instructions
Review the code for:
- Correctness and logic errors
- Security vulnerabilities
- Performance issues
- Code style and readability
- Edge cases and error handling

Provide specific, actionable feedback with line references where possible.`

,

  'debug': (f) => `You are a senior software engineer helping debug an issue.

## Problem Description
${f.problem || '<describe the problem>'}

## Error Message (if any)
\`\`\`
${f.errorMessage || 'No error message — describe the incorrect behavior'}
\`\`\`

## What You've Already Tried
${f.attempted || 'Nothing yet'}

## Instructions
Think step by step:
1. Identify the most likely root cause(s)
2. Explain why the issue is occurring
3. Provide a concrete fix with code
4. Suggest how to prevent it in the future`

,

  'creative-writing': (f) => `You are a skilled writer helping with creative content.

## Writing Type
${f.writingType || 'Not specified (e.g., blog post, email, story, cover letter)'}

## Tone
${f.tone || 'Neutral and professional'}

## Target Audience
${f.audience || 'General audience'}

## Key Points / Content to Cover
${f.keyPoints || '<what should this piece include?>'}

## Instructions
Write the content requested above. Make it engaging, well-structured, and tailored to the specified tone and audience.`

,

  'brainstorm': (f) => `You are a creative thinking partner helping generate and refine ideas.

## Goal
${f.goal || '<what are you trying to achieve?'}

## Constraints (optional)
${f.constraints || 'No specific constraints'}

## How Many Ideas?
${f.count || '5 ideas'}

## Instructions
Generate ${f.count || '5'} diverse, creative ideas that directly address the goal. For each idea, provide:
- A short, catchy name
- A 2-3 sentence description
- Why it could work
- One potential drawback

Then highlight the most promising 2-3 and explain why they stand out.`

,

  'analysis': (f) => `You are an analytical expert helping make sense of complex information.

## Material to Analyze
${f.material || '<paste text, data, or describe the document to analyze>'}

## Analytical Framework (optional)
${f.framework || 'Use your best judgment for appropriate analytical methods'}

## Depth of Analysis
${f.depth || 'Balanced — cover key points with reasonable depth'}

## Instructions
Provide a thorough analysis using ${f.framework || 'appropriate analytical methods'}. Include:
- Key findings and patterns
- Strengths and weaknesses
- Implications and consequences
- Supporting evidence from the material`

,

  'learning': (f) => `You are a patient, knowledgeable tutor helping someone learn.

## Topic
${f.topic || '<what do you want to learn?'}

## Current Level
${f.currentLevel || 'Beginner — assume little to no prior knowledge'}

## Learning Style Preference
${f.style || 'Practical — include real examples and exercises'}

## Goals (optional)
${f.goals || 'Gain a solid foundational understanding'}

## Instructions
Teach the topic as a ${f.style || 'practical'} tutor would. Start with foundational concepts and build up clearly. Include:
- Core concepts with clear explanations
- Real-world examples and analogies
- Common misconceptions to avoid
- A quick exercise or two to reinforce learning
- Next steps for continued learning`

,

  'data-extraction': (f) => `You are a data extraction specialist. Extract structured information from the provided source.

## Extraction Task
${f.topic || '<what information to extract?>'}

## Expected Schema / Format
\`\`\`
${f.schema || 'Provide a clear list of fields to extract'}
\`\`\`

## Source Material
${f.source || '<paste the text to extract from>'}

## Instructions
Carefully read the source material and extract the requested information into the specified schema. If a field is not found in the source, mark it as null. Be precise — do not infer or hallucinate data. If extraction is partial, note what's missing.`

,

  'summarization': (f) => `You are an expert at distilling complex information into clear, useful summaries.

## Source Material
${f.sourceMaterial || '<paste the content to summarize>'}

## Desired Length
${f.length || 'Medium — 3-5 key bullet points'}

## Focus (optional)
${f.focus || 'All important points — let me decide what matters'}

## Instructions
Summarize the source material in ${f.length || '3-5 key points'}.${f.focus && f.focus !== 'All important points' ? ` Prioritize: ${f.focus}` : ''} Make each point self-contained and informative on its own. Preserve key data, names, and figures.`,
};

interface PromptEngineerProps {
  onUse: (prompt: string) => void;
  onClose: () => void;
  disabled?: boolean;
}

const PromptEngineer = memo(function PromptEngineer({ onUse, onClose, disabled }: PromptEngineerProps) {
  const [taskType, setTaskType] = useState<TaskType>('code-review');
  const [fields, setFields] = useState<TaskFields>({});
  const [preview, setPreview] = useState('');

  // Live preview — set-state-in-effect is intentional here: synchronizing derived state from external inputs
  useEffect(() => {
    const prompt = PROMPT_TEMPLATES[taskType](fields);
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPreview(prompt);
  }, [taskType, fields]);

  const update = useCallback((key: keyof TaskFields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleUse = useCallback(() => {
    onUse(preview);
  }, [preview, onUse]);

  return (
    <div className="rounded-xl bg-slate-900/95 border border-slate-700/50 p-4 text-white text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-slate-100">Prompt Engineer</span>
        </div>
      </div>

      {/* Task Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {TASK_TYPES.map(tt => (
          <button
            key={tt.value}
            onClick={() => { setTaskType(tt.value); setFields({}); }}
            className={`px-3 py-2 rounded-lg text-xs text-left transition-all border ${
              taskType === tt.value
                ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-750'
            }`}
            title={tt.description}
          >
            {tt.label}
          </button>
        ))}
      </div>

      {/* Dynamic Fields */}
      <DynamicFields taskType={taskType} fields={fields} onChange={update} />

      {/* Preview */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Prompt Preview</span>
          <button
            onClick={() => { navigator.clipboard.writeText(preview); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            title="Copy to clipboard"
          >
            Copy
          </button>
        </div>
        <div className="bg-slate-950 rounded-lg p-3 text-xs text-slate-300 font-mono max-h-56 overflow-y-auto leading-relaxed whitespace-pre-wrap border border-slate-800">
          {preview || 'Fill in the fields above…'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          onClick={onClose}
          disabled={disabled}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={handleUse}
          disabled={disabled}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Use Prompt
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});

export default PromptEngineer;

// ── Dynamic fields per task type ────────────────────────────────────────────

function DynamicFields({ taskType, fields, onChange }: { taskType: TaskType; fields: TaskFields; onChange: (k: keyof TaskFields, v: string) => void }) {
  switch (taskType) {
    case 'code-review':
      return (
        <div className="space-y-2">
          <Field label="Language / Framework" placeholder="e.g. TypeScript, Python, React…" value={fields.language ?? ''} onChange={v => onChange('language', v)} />
          <Field label="Code to Review" placeholder="Paste your code here…" value={fields.code ?? ''} onChange={v => onChange('code', v)} textarea tall />
          <Field label="Specific Concerns (optional)" placeholder="e.g. performance, security, readability…" value={fields.concerns ?? ''} onChange={v => onChange('concerns', v)} />
        </div>
      );

    case 'debug':
      return (
        <div className="space-y-2">
          <Field label="Problem Description" placeholder="What is going wrong?" value={fields.problem ?? ''} onChange={v => onChange('problem', v)} textarea />
          <Field label="Error Message (if any)" placeholder="Paste the error message or describe incorrect behavior…" value={fields.errorMessage ?? ''} onChange={v => onChange('errorMessage', v)} textarea />
          <Field label="What You've Tried" placeholder="Any solutions you've already attempted…" value={fields.attempted ?? ''} onChange={v => onChange('attempted', v)} textarea />
        </div>
      );

    case 'creative-writing':
      return (
        <div className="space-y-2">
          <Field label="Writing Type" placeholder="e.g. blog post, cold email, short story, cover letter…" value={fields.writingType ?? ''} onChange={v => onChange('writingType', v)} />
          <Field label="Tone" placeholder="e.g. professional, witty, empathetic, urgent…" value={fields.tone ?? ''} onChange={v => onChange('tone', v)} />
          <Field label="Target Audience" placeholder="Who will read this?" value={fields.audience ?? ''} onChange={v => onChange('audience', v)} />
          <Field label="Key Points to Cover" placeholder="What should be included?" value={fields.keyPoints ?? ''} onChange={v => onChange('keyPoints', v)} textarea />
        </div>
      );

    case 'brainstorm':
      return (
        <div className="space-y-2">
          <Field label="Goal" placeholder="What are you trying to achieve or decide?" value={fields.goal ?? ''} onChange={v => onChange('goal', v)} textarea />
          <Field label="Constraints (optional)" placeholder="Budget, timeline, tech stack, anything limiting…" value={fields.constraints ?? ''} onChange={v => onChange('constraints', v)} />
          <Field label="How Many Ideas?" placeholder="e.g. 5 ideas, 10 options…" value={fields.count ?? ''} onChange={v => onChange('count', v)} />
        </div>
      );

    case 'analysis':
      return (
        <div className="space-y-2">
          <Field label="Material to Analyze" placeholder="Paste text, describe a document, or outline data…" value={fields.material ?? ''} onChange={v => onChange('material', v)} textarea tall />
          <Field label="Analytical Framework (optional)" placeholder="e.g. SWOT, root cause, cost-benefit…" value={fields.framework ?? ''} onChange={v => onChange('framework', v)} />
          <Field label="Depth" placeholder="e.g. quick overview, detailed report, exhaustive analysis…" value={fields.depth ?? ''} onChange={v => onChange('depth', v)} />
        </div>
      );

    case 'learning':
      return (
        <div className="space-y-2">
          <Field label="Topic" placeholder="What do you want to learn?" value={fields.topic ?? ''} onChange={v => onChange('topic', v)} textarea />
          <Field label="Current Level" placeholder="e.g. complete beginner, some experience, intermediate…" value={fields.currentLevel ?? ''} onChange={v => onChange('currentLevel', v)} />
          <Field label="Learning Style" placeholder="e.g. practical with exercises, theoretical, visual…" value={fields.style ?? ''} onChange={v => onChange('style', v)} />
          <Field label="Goals (optional)" placeholder="What does success look like?" value={fields.goals ?? ''} onChange={v => onChange('goals', v)} />
        </div>
      );

    case 'data-extraction':
      return (
        <div className="space-y-2">
          <Field label="What to Extract" placeholder="e.g. names, dates, prices, email addresses…" value={fields.topic ?? ''} onChange={v => onChange('topic', v)} />
          <Field label="Expected Schema" placeholder="e.g. { name: string, email: string, date: string }" value={fields.schema ?? ''} onChange={v => onChange('schema', v)} textarea />
          <Field label="Source Text" placeholder="Paste the text to extract from…" value={fields.source ?? ''} onChange={v => onChange('source', v)} textarea tall />
        </div>
      );

    case 'summarization':
      return (
        <div className="space-y-2">
          <Field label="Source Material" placeholder="Paste the article, transcript, or document to summarize…" value={fields.sourceMaterial ?? ''} onChange={v => onChange('sourceMaterial', v)} textarea tall />
          <Field label="Desired Length" placeholder="e.g. one paragraph, 5 bullet points, 3 sentences…" value={fields.length ?? ''} onChange={v => onChange('length', v)} />
          <Field label="Focus (optional)" placeholder="e.g. technical details, action items, main argument…" value={fields.focus ?? ''} onChange={v => onChange('focus', v)} />
        </div>
      );

    default:
      return null;
  }
}

// ── Shared field component ───────────────────────────────────────────────────

const Field = memo(function Field({
  label,
  placeholder,
  value,
  onChange,
  textarea,
  tall,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  tall?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={tall ? 6 : 3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
        />
      )}
    </div>
  );
});