/**
 * Khmer Workplace Tips — cultural guidance for Cambodian job seekers
 * navigating Western/International workplace norms.
 */

export interface WorkplaceTip {
  id: string;
  title: string;
  titleKh: string;
  icon: string;
  category: 'interview' | 'email' | 'salary' | 'culture';
  body: string;
  bodyKh: string;
  warning?: string;
  warningKh?: string;
}

export const WORKPLACE_TIPS: WorkplaceTip[] = [
  {
    id: 'tell-me-about-yourself',
    title: 'What "Tell Me About Yourself" Really Means',
    titleKh: 'អ្វីដែល "ប្រាប់ខ្ញុំអំពីខ្លួនអ្នក" ពិតប្រាកដ',
    icon: '🎯',
    category: 'interview',
    body: 'Do not start with childhood. This question asks for a PROFESSIONAL story.\n\nCorrect structure: NOW → PAST → FUTURE\n1. "I am currently [current role]"\n2. "Before that, I did [relevant past experience]"\n3. "Now I am looking for [what this job offers]"\n\nKeep it 60-90 seconds. End by connecting your story to THIS job.',
    bodyKh: 'កុំចាប់ផ្តើមពីការពិពណ៌នាអំពីកុមារភាព។ សំណួរនេះសួរអំពីប្រវត្តិក្រុមហ៊ុន។\n\nរចនាសម្ព័ន្ធត្រឹមត្រូវ: ប�្ចុប្បន្ន → អតីត → អនាគត\n១. "ប�្ចុប្បន្ន ខ្ញុំកំពុង [តួនាទី បច្ចុប្បន្ន]"\n២. "មុននេះ ខ្ញុំបាន [បទពិសោធន៍ ពីមេឃារ]"\n៣. "ឥឡូវ ខ្ញុំកំពុងស្វែងរក [អ្វីដែលការងារនេះផ្តល់]"\n\nKeep it 60-90 seconds. ចប់ដោយភ្ជាប់ប្រវត្តិរបស់អ្នកទៅនឹងការងារនេះ។',
    warning: 'Most Common Mistake: Starting with "I was born in..." or "My family is..." — interviewers want WORK, not biography.',
    warningKh: 'កំហុសទូទៅបំផុត: ចាប់ផ្តើមពី "ខ្ញុំក��នៅ..." — អ្នកសម្ភាសន៍ចង់ឃើញការងារ មិនbiography.',
  },
  {
    id: 'star-method',
    title: 'The STAR Method for Behavioral Questions',
    titleKh: 'វិធី STAR សម្រាប់សំណួរ ឥរិយាបទ',
    icon: '📋',
    category: 'interview',
    body: 'When asked "Tell me about a time when..." use STAR:\n\nS — Situation: Set the scene (1-2 sentences)\nT — Task: What was YOUR responsibility?\nA — Action: What SPECIFICALLY did you do? (Most important!)\nR — Result: What happened? Use numbers if possible.\n\nExample question: "Tell me about a time you handled conflict"\nSTAR Answer:\nS: My team had a deadline clash.\nT: I was asked to help resolve it.\nA: I organized a 30-minute meeting, listed priorities, proposed a split schedule.\nR: We delivered on time and the client renewed their contract.',
    bodyKh: 'នៅពេលបានសួរ "ប្រាប់ខ្ញុំពីពេលដែលអ្នក..." ប្រើ STAR:\n\nS — Situation: កំណត់ស្ថានភាព (១-២ប្រយោគ)\nT — Task: តួនាទីរបស់អ្នកផ្ទាល់គឺអ្វី?\nA — Action: អ្នកបានធ្វើអ្វីជាក់លាក់? (សំខាន់បំផុត!)\nR — Result: តើអ្វីបានកើតឡើង? ប្រើលេខបានល្អ។',
    warning: 'Do NOT answer with "We did..." — always say "I did..." Show YOUR contribution, not the team.',
    warningKh: 'កុំឆ្លើរថា "យើងបាន..." — តែងតែថា "ខ្ញុំបាន..."',
  },
  {
    id: 'salary-expectation',
    title: 'How to Answer "What Are Your Salary Expectations?"',
    titleKh: 'របៀប ឆ្លើរនឹង "តម្រូវការប្រាក់ខែ?',
    icon: '💰',
    category: 'salary',
    body: 'Never give a single number. Use a RANGE and reference research.\n\nGood answer:\n"I have researched typical rates for this role in Cambodia, and my expectation is between $400-$600, depending on the full benefits package."\n\nWhy ranges work:\n- Shows you have done research (professional)\n- Gives flexibility without undervaluing yourself\n- Opens negotiation, not closes it\n\nNever say: "I do not know" or "Whatever you think is fair" — this signals you do not know your worth.',
    bodyKh: 'កុំផ្តល់លេខតែមួយ។ ប្រើជួរ និង ផ្អែកលើការស្រាវជ្រាវ.\n\nGood answer:\n"ខ្ញុំបានស្រាវជ្រាវ អំពីប្រាក់ខែ ធម្មតិ នេះ $400-$600 អាស្រ័យលើ កញ្ចប់福利."',
    warning: 'Never say: "I do not know" or "Whatever you think is fair" — this signals you do not know your worth.',
    warningKh: 'Never say: "I do not know" or "Whatever you think is fair" — signals you do not know your worth.',
  },
  {
    id: 'follow-up-email',
    title: 'The Post-Interview Follow-Up Email',
    titleKh: 'អ៉ីម៉ែល តាមដានក្រោយ សម្ភាសន៍',
    icon: '📧',
    category: 'email',
    body: 'Send within 24 hours. Keep it SHORT and specific.\n\nTemplate:\nSubject: Thank You — [Job Title] Interview\n\nDear [Name],\n\nThank you for meeting with me today about the [Job Title] position. I enjoyed learning about the team and the [specific project] they mentioned.\n\nOur conversation reinforced my interest in this role, especially [something specific they said]. I am confident my experience in [your relevant skill] would help the team.\n\nPlease do not hesitate to reach out if you need anything else.\n\nBest regards,\n[Your Full Name]\n[Phone Number]',
    bodyKh: 'ផ្ញើក្នុង 24 ម៉ោង ។ រក្សាឲ្យខ្លី និង ជាក់លាក់.\n\nTemplate:\nSubject: អរគុណ — ការ សម្ភាសន៍ [ចំណងជើង]\n\nDear [Name],\n\nអរគុណច្រើន ដែលបានជួប ខ្ញុំ...\n\nPro tip: លើកឡើង អ្វីមួយ ជាក់លាក់ ពី ការ សម្ភាសន៍ — បង្ហាញ ថាអ្នក បាន ចាប់ អារម្មណ.',
    warning: 'In Khmer culture, following up too much can feel pushy. ONE email is appropriate. Do NOT call multiple times.',
    warningKh: 'នៅក្នុង វប្បធម៌ ខ្មែរ ការ តាម ដាន ច្រើន ពេក អាច បាត់ បង់ ។ អ៉ីម៉ែល ១ គឺ សម ្បន ។ កុំ ហៅ ច្រើន.',
  },
  {
    id: 'body-language',
    title: 'Body Language That Signals Professionalism',
    titleKh: 'ភាសា កេរ្តិ៍ — អ្វី ដែល បង្ហាញ ពី ភាព ជីវ',
    icon: '🤝',
    category: 'culture',
    body: 'Western interviews read body language closely. Key signals:\n\nDO: Make eye contact (but do not stare), Shake hands firmly, Sit up straight, Nod when listening, Smile genuinely.\n\nDO NOT: Look at the floor or ceiling, Cross your arms, Fidget with your phone, Laugh nervously, Speak while looking at your notes.\n\nNote: In Khmer culture, avoiding eye contact with elders is respectful. In Western job interviews, NOT making eye contact can seem dishonest or uninterested.',
    bodyKh: 'ការ សម្ភាសន៍ ប្រទេស ប�� អាច អាន ភាសា កេរ្តិ៍.\n\nDO: ធ្វើ ទា ក់ ទង ភ្នេ ស, ចា ប់ ដៃ មា ម, អង្គ ុ យ ត្រ ង់, gật đầu, ញ ញ ុ ំ.\n\nDO NOT: ម ើ ស ជើ ង, ល េ ប ដៃ, ចេ ញ ពី កា ំ ណ ។\n\nNote: នៅ ក្ន ុ ង វ ប ្ ប ធ ម ៌ ខ ្ ម ែ រ, កា រ ប ្ រ ំ ង ភ ្ នេ ស ជ ា ម ួ យ ់ គ ឺ ឧ ទ ា ហ រ ណ ៍.',
  },
  {
    id: 'cv-photo',
    title: 'CV Photo: When to Include, When to Skip',
    titleKh: 'រូ ប ភា ព CV: ពេ ល ណា ប include',
    icon: '📷',
    category: 'culture',
    body: 'In Cambodia, CVs with photos are common. For international companies and remote jobs:\n\nINCLUDE photo when: The job posting specifically requests it; It is a customer-facing role; Applying to a Cambodian or Asian company.\n\nSKIP photo when: Applying to international/Western companies; It is a remote job on platforms (Upwork, LinkedIn); The job explicitly says no photo required.\n\nPhoto specs if needed: Neutral background (blue or white); Professional attire; No selfies, no filters; 3x4 cm or passport-size.',
    bodyKh: 'នៅ ក្ន ុ ង ប ្ រ ទ េ ស ក ម ្ ព ុ ជ ា CV ជ ា ម ួ យ រ ូ ប ភ ា ព common.\n\nINCLUDE: job posting asks; customer-facing; ក ្ រ ុ ម ហ ៊ ុ ន ខ ្ ម ែ រ.\n\nSKIP: Remote jobs; Western companies; Upwork / LinkedIn applications.',
  },
  {
    id: 'weakness-answer',
    title: 'Talking About Weaknesses (Without Hurting Yourself)',
    titleKh: 'ន ិ យ ា យ អំ ពី ច ំ ណ ុ ច ខ ្ ស ស យ',
    icon: '💡',
    category: 'interview',
    body: 'What is your greatest weakness? is really: Are you self-aware and improving?\n\nThe formula: Real weakness + What you are doing to improve it\n\nExamples:\n- "I sometimes over-focus on details. I have started setting time limits."\n- "I used to struggle with public speaking. I joined a local Toastmasters group."\n- "I sometimes say yes to too many tasks. Now I use a priority matrix."\n\nNever say: "I am a perfectionist" or "I work too hard" — interviewers know these are fake.',
    bodyKh: 'What is your greatest weakness? — ព ិ ត ប ្ រ ា ក ដ " ត ើ អ ្ ន ក ដ ឹ ង ខ ្ ល ួ ន ឯ ង ន ិ ង ក ំ ព ុ ង improve?\n\nFormula: ច ំ ណ ុ ច ខ ្ ស ស យ ព ិ ត + អ ្ វ ី ដ ែ ល អ ្ ន ក ក ំ ព ុ ង ធ ្ វ ើ ប ំ រ ែ ។\n\nNever say: " ខ ្ ញ ំ ជ ា អ ្ ន ក perfect ionist" — interviewers know fake.',
  },
  {
    id: 'questions-for-interviewer',
    title: 'Questions to Ask the Interviewer (Shows You Are Serious)',
    titleKh: 'ស ំ ណ ួ រ ស ួ រ អ ្ ន ក ស ម ្ ភ ា ស ន ៍',
    icon: '❓',
    category: 'interview',
    body: 'Always have 2-3 questions ready. It signals you researched the company.\n\nGood questions:\n- What does success look like in this role after 90 days?\n- What is the biggest challenge the team is facing right now?\n- How would you describe the team culture here?\n- What opportunities are there for professional development?\n\nNever ask first: Salary/benefits (wait for them); "What does your company do?"; Vacation policies.',
    bodyKh: 'ត ្ រ ៀ ម ២-៣ ស ំ ណ ួ រ ជ ា ន ិ ច ្ ច ។ It signals you researched.\n\nGood questions:\n- តេ ជះ ជ ោ គ ជ ័ យ នេ ះ ន ៅ 90 ថ ្ ង ៃ?\n- ប ្ រ ក ា រ ធ ំ ប ំ ផ ỏ ត ក ្ រ ុ ម ក ំ?',
  },
];