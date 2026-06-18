export interface KhmerPhrase {
  kh: string;
  en: string;
  category: string;
  tags: string[];
}

export const KHMER_PHRASES: KhmerPhrase[] = [
  // Job & Career
  { kh: 'ជំនួបការងារ', en: 'Job interview preparation', category: 'Job & Career', tags: ['interview', 'resume'] },
  { kh: 'សំ បុត្រចូលរៀន', en: 'Application for university admission', category: 'Education', tags: ['university', 'admission'] },
  { kh: 'លិ ខ ិ ត ប ្រ ក ា ស ច ូ ល រ ៀ ន', en: 'Enrollment declaration letter', category: 'Education', tags: ['school', 'enrollment'] },
  { kh: 'អ ិ ច ស ី វ ិ ក', en: 'CV / Resume writing', category: 'Job & Career', tags: ['resume', 'job'] },
  { kh: 'ក ិ ច ចេ ក ទេ ស', en: 'Professional experience description', category: 'Job & Career', tags: ['experience', 'job'] },
  { kh: 'ល ិ ខ ិ ត ផ ្ ញ ើ រ', en: 'Business email writing', category: 'Business', tags: ['email', 'formal'] },
  { kh: 'ក ំ ណ ត ហេ ត ុ ប ្រ ជ ិ ន', en: 'Meeting minutes', category: 'Business', tags: ['meeting', 'work'] },
  { kh: 'ផ ែ ន ក ា រ គ ម ្ រ ប', en: 'Project proposal', category: 'Business', tags: ['proposal', 'project'] },
  { kh: 'រ ប ា យ ក ា រ ណ សេ វ ា', en: 'Healthcare appointment request', category: 'Health', tags: ['hospital', 'appointment'] },
  { kh: 'វ ិ ក ា ទ ី សេ វ ន', en: 'Medical history summary', category: 'Health', tags: ['medical', 'history'] },
  { kh: 'ក ា រ ប ញ ច ា ល', en: 'Travel itinerary', category: 'Travel', tags: ['trip', 'planning'] },
  { kh: 'ក ំ ណ ន ់ រ ក ា រ', en: 'Hotel booking request', category: 'Travel', tags: ['hotel', 'booking'] },
  { kh: 'ម ត ិ ក ា រ', en: 'Product feedback', category: 'General', tags: ['feedback', 'review'] },
  { kh: 'ក ា រ ត ប សេ វ', en: 'Customer complaint letter', category: 'General', tags: ['complaint', 'service'] },
  { kh: 'ល ិ ខ ិ ត ប ន ិ ទ ា ន', en: 'Permission request letter', category: 'General', tags: ['official', 'letter'] },
];

export const CATEGORIES = [...new Set(KHMER_PHRASES.map(p => p.category))];

// ---------------------------------------------------------------------------
// Formal Letter / Writing Templates — Khmer/Cambodian official letter formats
// Use with AI to draft or complete a letter for any purpose.
// ---------------------------------------------------------------------------

export interface WritingTemplate {
  id: string;
  khTitle: string;
  enTitle: string;
  khBody: string;   // structured template with [PLACEHOLDERS]
  enBody: string;
  whenToUse: string;
}

export const WRITING_TEMPLATES: WritingTemplate[] = [
  {
    id: 'job-application',
    khTitle: 'លិខិតស្នើសុំការងារ',
    enTitle: 'Job Application Letter',
    whenToUse: 'Apply for any job position in Cambodia',
    khBody: `ទទួលបាទ/ជេស្ឋ លោក/លោកស្រី [ឈ្មោះអ្នកគ្រប់គ្រងផ្នែកបុគ្គលិក],
[ឈ្មោះរបស់ខ្ញុំ] បានទទួលដំណឹងពីការជេរប្រាស្រ័យទាក់ទងតំណែង [តំណែង] នៅ [ឈ្មោះក្រុមហ៊ុន] ហើយចង់ដាក់ពាក្យស្នើសុំ។
ខ្ញុំមានបទពិសោធន៍ [ចំនួនឆ្នាំ] នៃការងារក្នុង [ផ្នែក/ឧស្សាហ៍កម្ម] ហើយមានចំណេះដឹងលើ [ជំនាញ/ផ្នែកពាក់ព័ន្ធ]។
ខ្ញុំបានទទួលបាន [សញ្ ញាបត្រ/វិញ្ ញាបនបត្រ] ពី [ឈ្មោះស្ ថាបត្យកម្ម] ក្នុងឆ្នាំ [ឆ្នាំ]។
ខ្ញុំពេញចិត្តនឹងពិភាក្សាអំពីតំណែងនេះក្នុងការសាកសួរ។
ទំនាក់ទំនង: [លេខទូរស័ព្ទ] | [អ៊ីមែល]`,
    enBody: `Dear [Hiring Manager's Name],

I am writing to express my interest in the [Position Title] at [Company Name], as advertised [where you found the job posting].

With [number] years of experience in [industry/sector] and a background in [relevant skills], I am confident in my ability to contribute effectively to your team.

I hold a [degree/certification] from [Institution Name], obtained in [year]. My most recent role was [Job Title] at [Company], where I [key achievement or responsibility].

I have attached my CV for your review and would welcome the opportunity to discuss how my skills align with your needs.

Contact: [Phone] | [Email]`,
  },
  {
    id: 'leave-request',
    khTitle: 'លិខិតស្នើសុំច្បាប់',
    enTitle: 'Leave / Absence Request',
    whenToUse: 'Request official leave from work or school',
    khBody: `ទទួលបាទ/ជេស្ឋ លោក/លោកស្រី [អ្នកគ្រប់គ្រង/នាយក],
ខ្ញុំ [ឈ្មោះ] កំពុងបម្រើការងារជា [តំណែង] នៅ [ក្រុមហ៊ុន/ស្ថាប័ន]។
ខ្ញុំសុំច្បាប់ [ប្រភេទ: ប្រចាំថ្ងៃ ឬ ឆ្លងថ្ងៃ] ចាប់ពីថ្ងៃទី [ថ្ងៃ] ដល់ថ្ងៃទី [ថ្ងៃ] (ចំនួន [ថ្ងៃ] ថ្ងៃ) �ោយមេត្រី [មូល ហេតុ: ការព្ យាបាល ឬ ការធ្វើដំណើរ ឬ ហេតុផលផ្ ទេស]។
ខ្ញុំបានរៀបចំ [ការចា ត់ចែ ង: ប្រគ ល់កា រងា រឬ មេ ត្រី] ហើយនឹងត្ រ d3 វិ លតា ងវិ ញ នៅ [ថ្ងៃត្ រាប់]។
សូមអរ គុ ណ!`,
    enBody: `Dear [Manager/Supervisor's Name],

I am [Your Name], currently working as [Your Position] at [Company/Organization].

I am writing to request leave from [Start Date] to [End Date], a total of [number] working days, for the following reason: [reason — e.g., medical treatment, family emergency, personal travel].

I have arranged for [any handover or coverage arrangement] to ensure work continuity during my absence. I will be reachable at [phone/email] if needed.

Thank you for considering my request.`,
  },
  {
    id: 'complaint-letter',
    khTitle: 'លិខិតត វាទ (Complaint Letter)',
    enTitle: 'Service / Complaint Letter',
    whenToUse: 'File a formal complaint to a company, agency, or service provider',
    khBody: `ទទួលបាទ/ជេស្ឋ លោក/លោកស្រី [ឈ្មោះអ្នកទទូច],
[ឈ្មោះរបស់ខ្ញុំ] ជាអតិ ថ ិជននៃ [ឈ្មោះសេ វា ក ម្ម/ផល ិ ត ផ ល] ចាប់ពី [ថ ិ រ ក ា រ]។
ថ្ងៃទី [ក) ខ ខ ប ា ន [ថ ិ រ ក ា រ] ខ្ញុំបានជួ ប [ប ញ ច ា ល: ប ញ ច ា ល រ ប ស ឋ គ ួ ន ឬ ប ញ ច ា ល ព ី ក ា រ] ដ ូ ច ខ ា ង ក ្រ ា ប: [ស រ ប ស ឋ គ ួ ន រ ប ា យ]។
[ស ក ល ភ ា ព: ត ើ ង ប ា ន ប ញ ច ា ល/ ក ា រ ខ ូ ច/ ប ញ ច ា ល] [ច ន ួ ន] ដ ង ហេ ត ុ ផ ល ិ ត/ សេ វ ា ក ម រ ប ស ឋ គ ួ ន រ ប ា យ] ហ᾽ រ យ ។
[ស ុ ឆ ន ទ រ: ខ ា ង ក ្រ ា ប: ខ ូ ច ឬ ព ា ក យ យ ថ ្ ង ា ត ប ា ន] [អ ី ប ញ ទ ន: ជ ួ ស ជ ុ ល ឬ ប ង ្ គ ត ថ ា ន រ ឺ ស] ន ឹ ង ព ិ ស រ ា យ ។
[ស ុ ឆ ន ទ រ]`,
    enBody: `Dear [Recipient's Name / Customer Service Manager],

My name is [Your Name] and I am a [customer/member] of [Service/Company Name] since [date].

On [date], I experienced [problem description — e.g., billing error, poor service quality, product defect]. Despite my attempts to resolve this on [date(s)], the issue remains unresolved.

I have attached copies of [relevant documents: receipts, correspondence, photos] for your reference. I respectfully request that you [specific remedy: refund, replacement, explanation, corrective action].

I trust this matter will be resolved promptly. Please contact me at [phone] or [email].`,
  },
  {
    id: 'reference-letter-request',
    khTitle: 'លិខិតស្នើសុំលិខិតបញ្ជាក់',
    enTitle: 'Letter of Recommendation Request',
    whenToUse: 'Ask a professor or employer for a reference/recommendation letter',
    khBody: `ទទួលបាទ/ជេស្ឋ លោក/លោកស្រី បណ្ឌិត/ស ាក ល [ឈ្មោះ],
ខ្ញុំ [ឈ្មោះ] បានប be ញច្បាប់ [ឆ្នេរ/វ ិេ ទ យ] ក្នុ ង [ឆ្ ន ា ឆ ្ នេ រ] [ឈ្ ម ោ ះ ស ា ក ល] ក្ ន ុ ង ឆ ្ នេ រ [ឆ ្ ន ា ឆ] ហ᾽ រ ។
ខ្ ញ ុ ំ បា ន ដ ា ក យ ព ា ក ្ យ [តំ ណ ែ ង/ក ា រ ង ា រ] [ឈ ្ ម ោ ះ] ន ឹ ង ប ា ន ទ ទ ួ ល [ល ទ ធ ផ ល/ប ទ ព ិ ស រ ា យ] ក ្ ន ុ ង [ផ ល ិ ត ភ ា ព] ។
ខ ្ ញ ុ ំ ក ា រ ង ា រ [តំ ណ ែ ង] [URL] ហ᾽ រ ។
ប ្ រ ស ើ រ, ខ ្ ញ ុ ំស ុ ប ញ ល ដ ោ យ ល ិ ខ ិ ត ប ញ ជ ា ក ់ ស ម ី ង [ឬ ធ ី ន] ព ី លោ ក ប ណ ្ ឌ ិ ត ស ម ី ង ញ ក ល ភ ា ព ន ា ក ា រ ស ិ ក ា រ ន ឹ ង [ម ្ រ ប ស ា ច] ។
[CV/portfolio URL]`,
    enBody: `Dear [Professor/Manager's Name],

I am [Your Name], a [former student/employee] who studied/worked under your supervision from [year] to [year] in the [Program/Department] at [Institution/Company].

I am currently applying for [purpose — e.g., a graduate program, a scholarship, a job position] at [Institution/Company], and I believe your recommendation would greatly strengthen my application.

I have attached my CV and portfolio: [URL]. I would be grateful if you could highlight my [specific strengths, academic performance, or work achievements] in the letter.

I understand you are busy — please let me know if you need any additional information.`,
  },
  {
    id: 'official-permission',
    khTitle: 'លិខិតស្នើសុំអន ុ ញ ា ត ិ',
    enTitle: 'Official Permission / Request Letter',
    whenToUse: 'Request official permission from a government office, school, or institution',
    khBody: `ទទួលបាទ/ជេស្ឋ លោក/លោកស្រី [នាយក/ប ណ្ ឌ ិ ត],
[ខ ្ ញ ុ ំ/ព ួ ក យ] ឈ ្ ម ោ ះ [ឈ ្ ម ោ ះ] ប ា ន [អ ា យ ុ ម ា ន/ន ៅ ប ា ន] [ត ួ ល ក ា រ/ស ក ល ភ ា ព] ន ា ក ា រ [ប ញ ច ា ល] ។
[ខ ្ ញ ុ ំ/ព ួ ក យ] ស ុ ប ញ ល [ស ក ល ភ ា ព/ប ្ រ ភ ា ព/ក ា រ ង ា រ] [ដ ូ ច ខ ា ង ក ្ រ ា ប] ៖ [ស ុ ទ ិ ន ប ត ធ] ។
[ប ញ ច ា ល] [ថ ិ រ ក ា រ] [ស ក ល ភ ា ព/ប ្ រ ភ ា ព] ន ឹ ង [ក ា រ ង ា រ/ស ក ល ភ ា ព] [ល ទ ធ ផ ល] ។
[ស ុ ឆ ន ទ រ]`,
    enBody: `Dear [Recipient's Title / Director / Officer],

[Your Full Name], [position/title] of [Organization], respectfully request your permission to [activity/project description — e.g., conduct a survey, use a venue, access records, organize an event].

The purpose is to [explain goal/objective]. This [activity/project] will take place from [start date] to [end date] at [location], and will [benefit or impact].

I have attached the following supporting documents: [list documents].
Your approval would enable us to [positive outcome]. Thank you for your consideration.`,
  },
];