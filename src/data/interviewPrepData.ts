export interface InterviewQuestion {
  id: string;
  en: string;
  kh: string;
  category: string;
  tips: string[];
  industry?: string; // optional industry tag
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

// Cambodia-specific industry tracks
export const INDUSTRIES = [
  { id: 'all', label: 'All Industries', icon: '🏢' },
  { id: 'garment', label: 'Garment / Factory', icon: '🧵' },
  { id: 'hospitality', label: 'Hospitality & Tourism', icon: '🏨' },
  { id: 'retail', label: 'Retail & Sales', icon: '🛒' },
  { id: 'finance', label: 'Finance & Banking', icon: '💰' },
  { id: 'callcenter', label: 'Call Center / BPO', icon: '📞' },
  { id: 'tech', label: 'Tech Startup', icon: '💻' },
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

  // ─── GARMENT / FACTORY ───────────────────────────────────────────────────
  {
    id: 'g1',
    category: 'Experience',
    industry: 'garment',
    en: 'Do you have experience working on a production line? What was your daily target?',
    kh: 'Chenh jing aa jeat toh jing srok bagn laor?',
    tips: [
      'Factory targets are usually measured in pieces or meters — know the common benchmarks',
      'Show you understand the pace required: 60-100 pieces/hour is typical for basic sewing',
      'Emphasize attendance record — factories strictly enforce absentee policies',
    ],
  },
  {
    id: 'g2',
    category: 'Situational',
    industry: 'garment',
    en: 'How do you handle working in a hot factory environment for long hours?',
    kh: 'A tehb aa jing jing prolognasaj?',
    tips: [
      'Factories can reach 35°C+ — show physical stamina and mental resilience',
      'Mention bringing water, wearing appropriate clothing, and managing fatigue',
      'Some factories offer fans or AC in cutting/sewing sections — acknowledge this',
    ],
  },
  {
    id: 'g3',
    category: 'Salary & Availability',
    industry: 'garment',
    en: 'What is your expected monthly salary? Do you understand how overtime pay is calculated?',
    kh: 'A tehb chhmar srolae jing?',
    tips: [
      'Minimum wage in Cambodia (2025): $200/month + OT + benefits',
      'Overtime must be paid at 1.5x weekdays, 2x rest days, 3x public holidays',
      'Give a realistic range based on experience and position level',
    ],
  },
  {
    id: 'g4',
    category: 'Cultural Fit',
    industry: 'garment',
    en: 'Are you comfortable standing for 8+ hours and working 6 days per week during peak orders?',
    kh: 'Chenh jing 6 mey jing 8 horl?',
    tips: [
      'Factory peak seasons (Q4) often require Saturday work — confirm availability upfront',
      'Standing all day is physically demanding — show you understand and accept this',
      'Some workers take turns sitting when possible — mention adaptability',
    ],
  },

  // ─── HOSPITALITY & TOURISM ────────────────────────────────────────────────
  {
    id: 'h1',
    category: 'General',
    industry: 'hospitality',
    en: 'What is your English level? Can you handle a foreign guest complaint without a supervisor?',
    kh: 'English nung sorl Sâ?',
    tips: [
      'Hospitality requires conversational English at minimum — be honest about your level',
      'Use STAR format to show how you resolved a guest issue independently',
      'Cambodia tourism: guests from China, Korea, Japan, Europe, and America — multilingual is a plus',
    ],
  },
  {
    id: 'h2',
    category: 'Situational',
    industry: 'hospitality',
    en: 'A guest is unhappy with the room/food/service. How do you respond?',
    kh: 'Khasaar aanh jing korng jing, a tehb aa jing?',
    tips: [
      ' Cambodian hospitality culture: smile, apologize sincerely, fix immediately',
      'Never argue or blame the guest — de-escalate first, investigate after',
      'Know when to escalate to supervisor — safety and serious complaints go up immediately',
    ],
  },
  {
    id: 'h3',
    category: 'Salary & Availability',
    industry: 'hospitality',
    en: 'Can you work weekends, public holidays, and overnight shifts when required?',
    kh: 'Chenh preng tae jing chesmey Khmer?',
    tips: [
      'Hotels and restaurants operate 7 days/week — flexibility is expected',
      'Public holidays (especially Pchum Ben, Khmer New Year) are busiest — confirm availability',
      'Rotation shifts are common in larger hotels — show adaptability',
    ],
  },
  {
    id: 'h4',
    category: 'Strengths & Weaknesses',
    industry: 'hospitality',
    en: 'What does "good service" mean to you in a Cambodian context?',
    kh: 'Aa jeat jing Khmer jing aa knea?',
    tips: [
      'Cambodian guests value warmth, patience, and personalized attention',
      'Foreign guests value efficiency and consistency',
      'Mention the balance: greet with a smile (Choul黔), remember preferences, anticipate needs',
    ],
  },

  // ─── RETAIL & SALES ───────────────────────────────────────────────────────
  {
    id: 'r1',
    category: 'Experience',
    industry: 'retail',
    en: 'Have you met a monthly sales target before? How did you exceed it?',
    kh: 'Baa jing jing korng jing?',
    tips: [
      'Use specific numbers: "I exceeded my target by 15% last quarter by doing X"',
      'Know the difference between individual and team targets',
      'In Cambodia retail: targets are common in cosmetics, telco, insurance, and electronics',
    ],
  },
  {
    id: 'r2',
    category: 'Situational',
    industry: 'retail',
    en: 'A customer says your product is too expensive compared to competitor X. How do you respond?',
    kh: 'AA jeat Khmer jing neak aa tehb chhmar?',
    tips: [
      'Never badmouth competitors — redirect to your product unique value',
      'In Cambodia: price is important but trust and relationship matter more',
      'Offer payment plans, bundle deals, or loyalty discounts when available',
    ],
  },
  {
    id: 'r3',
    category: 'Experience',
    industry: 'retail',
    en: 'How do you handle cash and manage the register at the end of the day?',
    kh: 'Jing jing jing jing?',
    tips: [
      'Cash handling requires honesty and accuracy — emphasize your integrity',
      'Count twice, keep receipts, never short-change customers',
      'In Cambodia: Mobile & QR payments (ABA, Wing, Pi Pay) are common — show you can handle both',
    ],
  },
  {
    id: 'r4',
    category: 'General',
    industry: 'retail',
    en: 'Why do you want to work in retail instead of another industry?',
    kh: 'A teh jing Khmer jing jing?',
    tips: [
      'Show genuine interest in sales and customer interaction',
      'Retail in Cambodia: formal (brand stores) vs informal (market stalls) — know the difference',
      'Mention career progression: sales → supervisor → store manager → regional',
    ],
  },

  // ─── FINANCE & BANKING ────────────────────────────────────────────────────
  {
    id: 'f1',
    category: 'Experience',
    industry: 'finance',
    en: 'Have you handled customer deposits, withdrawals, or money transfers before?',
    kh: 'Chenh aa jeat Khmer?',
    tips: [
      'Mention any experience with banking software, ATM operations, or mobile banking',
      'Accuracy is critical — double-checking is a feature, not a bug',
      'Cambodia: Wing, True Money, Pi Pay, and international transfers are common',
    ],
  },
  {
    id: 'f2',
    category: 'Cultural Fit',
    industry: 'finance',
    en: 'How would you respond if a colleague asked you to falsify a transaction record?',
    kh: 'Jing Khmer jing jing jing?',
    tips: [
      'Financial integrity is non-negotiable — answer firmly and clearly',
      'Know the consequences: in Cambodia, falsifying records is a criminal offense',
      'Show you know how to report concerns through proper channels',
    ],
  },
  {
    id: 'f3',
    category: 'Salary & Availability',
    industry: 'finance',
    en: 'This role involves handling large amounts of cash. Are you comfortable with that responsibility?',
    kh: 'Jing jing jing jing jing?',
    tips: [
      'Show you understand the seriousness — this is a trust role',
      'Mention any prior cash handling experience with accountability',
      'Background check will be required — be transparent about any issues',
    ],
  },
  {
    id: 'f4',
    category: 'Situational',
    industry: 'finance',
    en: 'A customer is angry because their transfer failed or ATM didn\'t dispense cash. How do you help?',
    kh: 'Jing jing jing jing?',
    tips: [
      'Stay calm — the customer is frustrated with the system, not with you',
      'Verify the transaction log before promising anything — never pay out without confirmation',
      'Know your escalation path: teller → supervisor → head office for disputed transactions',
    ],
  },

  // ─── CALL CENTER / BPO ─────────────────────────────────────────────────────
  {
    id: 'c1',
    category: 'General',
    industry: 'callcenter',
    en: 'What is your English speaking level? Read this sentence aloud: "I would like to check the status of my application."',
    kh: 'English nung sorl Sâ?',
    tips: [
      'Call center English needs to be clear, neutral accent, and professional tone',
      'Practice the phonetic sounds that Cambodians often confuse: p/b, t/d, s/sh',
      'Speed: aim for 140-160 words/minute — clear is better than fast',
    ],
  },
  {
    id: 'c2',
    category: 'Situational',
    industry: 'callcenter',
    en: 'A caller is shouting and using rude language. What do you do?',
    kh: 'Khasaar aa jeat jing Khmer?',
    tips: [
      'Never shout back — stay calm, lower your voice slightly to de-escalate',
      'Use phrases: "I understand this is frustrating, let me help you"',
      'In Cambodia: many callers speak Khmer first — know when to switch language',
    ],
  },
  {
    id: 'c3',
    category: 'Salary & Availability',
    industry: 'callcenter',
    en: 'Are you available for night shifts (midnight to 8 AM)? Some clients are US/EU timezones.',
    kh: 'Chenh jing Khmer jing jing?',
    tips: [
      'Be honest about night shift availability — health and transportation matter',
      'Night shift allowances are common — know your rights under Cambodian labor law',
      'BPO industry in Cambodia: major clients include US, Australian, and Singaporean companies',
    ],
  },
  {
    id: 'c4',
    category: 'Cultural Fit',
    industry: 'callcenter',
    en: 'This job requires you to read from a script. Are you comfortable not improvising freely?',
    kh: 'Jing jing Khmer jing jing?',
    tips: [
      'Call centers have scripts for compliance — show you can adapt your personality within the script',
      'Quality assurance (QA) calls are monitored — show attention to detail',
      'Career path: agent → team leader → coach → operations',
    ],
  },

  // ─── TECH STARTUP ─────────────────────────────────────────────────────────
  {
    id: 't1',
    category: 'General',
    industry: 'tech',
    en: 'Tell me about a project where you learned a new technology on your own to solve a problem.',
    kh: 'Jing jing jing Khmer?',
    tips: [
      'Self-learning is expected in startups — show you can research, experiment, and iterate',
      'Use a concrete example: "I learned React in 2 weeks to build a dashboard"',
      'In Cambodia tech: common stacks are JS/TS, Python, PHP, and increasingly Go and Rust',
    ],
  },
  {
    id: 't2',
    category: 'Situational',
    industry: 'tech',
    en: 'How do you handle working remotely? Do you have reliable internet and a proper workspace?',
    kh: 'Jing jing Khmer jing?',
    tips: [
      'Remote/hybrid is common in Cambodian tech startups — confirm your setup',
      'Mention tools: Slack, Notion, GitHub, Zoom — show familiarity with async communication',
      'Internet in Cambodia: fiber is widely available in Phnom Penh, 4G for rural areas',
    ],
  },
  {
    id: 't3',
    category: 'Cultural Fit',
    industry: 'tech',
    en: 'We move fast and sometimes priorities change daily. How do you handle frequent changes?',
    kh: 'Jing jing Khmer jing?',
    tips: [
      'Show adaptability: "I re-prioritize daily and communicate changes to stakeholders"',
      'Mention experience in agile/scrum if applicable',
      'Cambodian tech scene: many startups serve the ASEAN market — multilingual is a plus',
    ],
  },
  {
    id: 't4',
    category: 'Experience',
    industry: 'tech',
    en: 'Have you worked in a flat hierarchy where you可以直接挑战 senior decisions? How did you handle disagreement?',
    kh: 'Jing jing Khmer jing?',
    tips: [
      'Startups value direct feedback culture — show you can disagree and commit',
      'Use data and examples to support your position — "I suggested X because of Y metric"',
      'Know when to escalate: technical debt, security issues, and user safety go up immediately',
    ],
  },
];