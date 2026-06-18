export interface InterviewQuestion {
  id: string;
  en: string;
  kh: string;
  category: string;
  tips: string[];
}

export const INTERVIEW_CATEGORIES = [
  'All',
  'General',
  'Strengths & Weaknesses',
  'Experience',
  'Salary & Availability',
  'Situational',
  'Cultural Fit',
];

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: '1',
    category: 'General',
    en: 'Can you introduce yourself?',
    kh: 'Kanha anhaung ja.',
    tips: [
      'Keep it under 2 minutes: background, education, key skills',
      'Mention specific achievements with numbers (e.g., "increased sales by 30%")',
      'End with why you want this specific role',
    ],
  },
  {
    id: '2',
    category: 'General',
    en: 'Why do you want to work for our company?',
    kh: 'A terh chenh aa korng ning aa jeat?',
    tips: [
      'Research the company beforehand — mention specific products, values, or growth',
      'Connect the company mission to your personal career goals',
      'Avoid generic answers like "good salary" or "near my house"',
    ],
  },
  {
    id: '3',
    category: 'General',
    en: 'Where do you see yourself in 3-5 years?',
    kh: 'Chboan ning jing knea 3-5 chhou?',
    tips: [
      'Show ambition that aligns with the company growth path',
      'Avoid mentioning plans to leave or start your own business soon',
      'Frame it as growing alongside the company',
    ],
  },
  {
    id: '4',
    category: 'Strengths & Weaknesses',
    en: 'What are your greatest strengths?',
    kh: 'Ot jea bphaal tbaan?',
    tips: [
      'Pick 2-3 strengths directly relevant to the job description',
      'Back each strength with a concrete example or result',
      'Cambodian employers value: reliability, teamwork, willingness to learn',
    ],
  },
  {
    id: '5',
    category: 'Strengths & Weaknesses',
    en: 'What is your biggest weakness?',
    kh: 'Ot jing bphaal tbaan?',
    tips: [
      'Choose a real weakness that is not a core job requirement',
      'Show self-awareness and what you are doing to improve',
      'Example: "I used to struggle with public speaking — I joined Toastmasters"',
    ],
  },
  {
    id: '6',
    category: 'Experience',
    en: 'Tell me about your previous work experience.',
    kh: 'Knea aa jeat ning korng chenh toh.',
    tips: [
      'Use STAR format: Situation, Task, Action, Result',
      'Focus on accomplishments, not just duties',
      'Quantify results: time saved, money earned, efficiency improved',
    ],
  },
  {
    id: '7',
    category: 'Experience',
    en: 'How do you handle conflict in a team?',
    kh: 'Aneh jing knea teansaal yeung?',
    tips: [
      'Cambodian workplace culture values harmony — show diplomacy',
      'Give a real example of resolving a disagreement constructively',
      'Emphasize listening first, not escalating',
    ],
  },
  {
    id: '8',
    category: 'Salary & Availability',
    en: 'What is your expected salary?',
    kh: 'A tehb chhmar tbaan?',
    tips: [
      'Research market rates for the role in Cambodia first',
      'Give a range, not a fixed number',
      'Factor in: experience, benefits, 13th-month pay, bonuses',
      'Do not accept the first offer immediately — negotiate professionally',
    ],
  },
  {
    id: '9',
    category: 'Salary & Availability',
    en: 'When can you start?',
    kh: 'Teansaal nung chas chong?',
    tips: [
      'Give at least 2 weeks notice to current employer (professional courtesy)',
      'If immediately available, say so confidently',
      'If you need to relocate, mention the timeline required',
    ],
  },
  {
    id: '10',
    category: 'Situational',
    en: 'How would you handle a difficult client?',
    kh: 'A tehb aa chenh chhlong yeung?',
    tips: [
      'Stay calm and listen first — never argue back',
      'Show empathy, then offer solutions',
      'In Cambodia, saving face is important — handle complaints privately',
    ],
  },
  {
    id: '11',
    category: 'Situational',
    en: 'How do you prioritize when everything is urgent?',
    kh: 'Tbaan chas ollu yeung?',
    tips: [
      'Show a logical system: urgent vs. important matrix',
      'Give a real example of managing competing deadlines',
      'Mention communicating with your manager to set priorities',
    ],
  },
  {
    id: '12',
    category: 'Situational',
    en: 'What would you do in your first 90 days?',
    kh: 'Baa jing 90 mey aa jeat tbaan?',
    tips: [
      'Show a learner mindset — listen, observe, ask questions',
      'Mention building relationships and understanding workflows',
      'Set measurable goals for yourself by day 30, 60, 90',
    ],
  },
  {
    id: '13',
    category: 'Cultural Fit',
    en: 'Cambodian employers value loyalty, respect, and teamwork. How do these show in your work style?',
    kh: 'A tehb aa jeat jing korng?',
    tips: [
      'Show respect for seniority and hierarchy in your answer',
      'Give examples of supporting colleagues and contributing to team goals',
      'Mention adaptability to Cambodian workplace culture',
    ],
  },
  {
    id: '14',
    category: 'Cultural Fit',
    en: 'Are you comfortable working overtime when needed?',
    kh: 'Chenh preng tae jing tbaan?',
    tips: [
      'Be honest about your availability, but show flexibility',
      'IT and services industries often have peak seasons requiring overtime',
      'Frame it as willingness to go the extra mile for important projects',
    ],
  },
];