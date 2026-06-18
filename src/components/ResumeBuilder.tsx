import React, { memo, useState, useRef, useCallback } from 'react';
import { X, Plus, Trash2, FileDown, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface Experience { company: string; role: string; startYear: string; endYear: string; description: string; }
interface Education { school: string; degree: string; year: string; }

interface ResumeData {
  name: string; email: string; phone: string; linkedin: string; summary: string;
  experience: Experience[]; skills: string[]; education: Education[]; template: 'modern' | 'classic';
}

const STEPS = ['Personal Info', 'Experience', 'Skills', 'Education', 'Template', 'Download'];

interface Props { onClose: () => void; }

export const ResumeBuilder = memo(function ResumeBuilder({ onClose }: Props) {
  const { khLang } = useSettings();
  const isDark = true;

  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<ResumeData>({
    name: '', email: '', phone: '', linkedin: '',
    summary: '',
    experience: [{ company: '', role: '', startYear: '', endYear: '', description: '' }],
    skills: [],
    education: [{ school: '', degree: '', year: '' }],
    template: 'modern',
  });

  const [skillInput, setSkillInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ResumeData>(key: K, val: ResumeData[K]) =>
    setData(prev => ({ ...prev, [key]: val }));

  const addSkill = useCallback(() => {
    const s = skillInput.trim();
    if (!s || data.skills.includes(s)) return;
    set('skills', [...data.skills, s]);
    setSkillInput('');
    inputRef.current?.focus();
  }, [skillInput, data.skills]);

  const removeSkill = (s: string) => set('skills', data.skills.filter(x => x !== s));

  const addExp = () => set('experience', [...data.experience, { company: '', role: '', startYear: '', endYear: '', description: '' }]);
  const updateExp = (i: number, patch: Partial<Experience>) => set('experience', data.experience.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const removeExp = (i: number) => set('experience', data.experience.filter((_, idx) => idx !== i));

  const addEdu = () => set('education', [...data.education, { school: '', degree: '', year: '' }]);
  const updateEdu = (i: number, patch: Partial<Education>) => set('education', data.education.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const removeEdu = (i: number) => set('education', data.education.filter((_, idx) => idx !== i));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  };

  const generate = async () => {
    if (!data.name || !data.email || !data.phone) { setError(khLang ? 'សូមប fillings all required fields.' : 'Please fill in all required fields.'); return; }
    setGenerating(true); setError('');
    try {
      const resp = await fetch('/api/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error?.message || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 border border-gray-700/50' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {khLang ? 'បង្កើតប្រវត្តិរូប' : 'Resume Builder'}
          </h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className={`flex items-center gap-1 px-6 py-3 border-b shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-500' : isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>
        <div className={`flex items-center justify-between px-6 py-1.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span>{STEPS[step]}</span>
          <span>{step + 1} / {STEPS.length}</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-3">
              {[
                { label: khLang ? 'Name *' : 'Full Name *', key: 'name', placeholder: 'Sok Chenda' },
                { label: 'Email *', key: 'email', placeholder: 'chenda@email.com', type: 'email' },
                { label: khLang ? 'Phone *' : 'Phone *', key: 'phone', placeholder: '+855 12 345 678' },
                { label: 'LinkedIn / URL', key: 'linkedin', placeholder: 'https://linkedin.com/in/chenda' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{f.label}</label>
                  <input
                    type={f.type ?? 'text'}
                    placeholder={f.placeholder}
                    value={(data as unknown as Record<string, string>)[f.key]}
                    onChange={e => set(f.key as keyof ResumeData, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'} focus:outline-none`}
                  />
                </div>
              ))}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{khLang ? 'Summary' : 'Professional Summary'}</label>
                <textarea
                  placeholder={khLang ? 'Brief professional summary...' : 'Brief professional summary...'}
                  value={data.summary}
                  onChange={e => set('summary', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors resize-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'} focus:outline-none`}
                />
              </div>
            </div>
          )}

          {/* Step 1: Experience */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{khLang ? 'Work Experience' : 'Work Experience'}</p>
                <button onClick={addExp} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {khLang ? 'Add' : 'Add'}
                </button>
              </div>
              {data.experience.map((exp, i) => (
                <div key={i} className={`p-3 rounded-xl border space-y-2 ${isDark ? 'border-gray-700/50 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    <input
                      placeholder={khLang ? 'Company' : 'Company'}
                      value={exp.company}
                      onChange={e => updateExp(i, { company: e.target.value })}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                    />
                    {data.experience.length > 1 && (
                      <button onClick={() => removeExp(i)} className="p-1 text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder={khLang ? 'Job Title' : 'Job Title'}
                      value={exp.role}
                      onChange={e => updateExp(i, { role: e.target.value })}
                      className={`px-2.5 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                    />
                    <div className="flex gap-1">
                      <input
                        placeholder={khLang ? 'From' : 'From'}
                        value={exp.startYear}
                        onChange={e => updateExp(i, { startYear: e.target.value })}
                        className={`w-14 px-2 py-1.5 rounded-lg text-sm border text-center ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                      />
                      <input
                        placeholder={khLang ? 'To' : 'To'}
                        value={exp.endYear}
                        onChange={e => updateExp(i, { endYear: e.target.value })}
                        className={`w-14 px-2 py-1.5 rounded-lg text-sm border text-center ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                      />
                    </div>
                  </div>
                  <textarea
                    placeholder={khLang ? 'Key responsibilities...' : 'Key responsibilities or achievements...'}
                    value={exp.description}
                    onChange={e => updateExp(i, { description: e.target.value })}
                    rows={2}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-sm border resize-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div className="space-y-3">
              <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{khLang ? 'Skills (press Enter to add)' : 'Skills (press Enter to add)'}</p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={khLang ? 'e.g. JavaScript, React...' : 'e.g. JavaScript, React, Node.js...'}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600 focus:border-indigo-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'} focus:outline-none`}
                />
                <button onClick={addSkill} className="px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium">{khLang ? 'Add' : 'Add'}</button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {data.skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-indigo-200 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {data.skills.length === 0 && <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No skills added yet</p>}
              </div>
            </div>
          )}

          {/* Step 3: Education */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Education</p>
                <button onClick={addEdu} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {khLang ? 'Add' : 'Add'}
                </button>
              </div>
              {data.education.map((edu, i) => (
                <div key={i} className={`p-3 rounded-xl border space-y-2 ${isDark ? 'border-gray-700/50 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <input
                      placeholder={khLang ? 'University / School' : 'University / School'}
                      value={edu.school}
                      onChange={e => updateEdu(i, { school: e.target.value })}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                    />
                    {data.education.length > 1 && (
                      <button onClick={() => removeEdu(i)} className="p-1 text-red-400 hover:text-red-300 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Degree"
                      value={edu.degree}
                      onChange={e => updateEdu(i, { degree: e.target.value })}
                      className={`px-2.5 py-1.5 rounded-lg text-sm border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                    />
                    <input
                      placeholder="Year"
                      value={edu.year}
                      onChange={e => updateEdu(i, { year: e.target.value })}
                      className={`px-2 py-1.5 rounded-lg text-sm border text-center ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} focus:border-indigo-500 focus:outline-none`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Template */}
          {step === 4 && (
            <div className="space-y-3">
              <p className={`text-xs font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Choose a template</p>
              {(['modern', 'classic'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => set('template', t)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${data.template === t ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-gray-600'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-14 rounded border-2 flex items-center justify-center ${data.template === t ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600'}`}>
                      {data.template === t ? <Check className="w-4 h-4 text-indigo-400" /> : null}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t === 'modern' ? 'Modern' : 'Classic'}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t === 'modern' ? 'Clean layout, colored accents' : 'Traditional, serif typography'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 5: Download */}
          {step === 5 && (
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${isDark ? 'border-gray-700/50 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Summary</h3>
                <div className="space-y-1 text-xs">
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium text-gray-200">Name:</span> {data.name}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium text-gray-200">Email:</span> {data.email}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium text-gray-200">Phone:</span> {data.phone}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium text-gray-200">Template:</span> {data.template}</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium text-gray-200">Experience:</span> {data.experience.length} position(s)</p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}><span className="font-medium text-gray-200">Skills:</span> {data.skills.length} skill(s)</p>
                </div>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t shrink-0 ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${step === 0 ? 'opacity-0 pointer-events-none' : ''} ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            {khLang ? 'Back' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium"
            >
              {khLang ? 'Next' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium disabled:opacity-60"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {generating ? (khLang ? 'Generating...' : 'Generating...') : (khLang ? 'Download PDF' : 'Download PDF')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
});
