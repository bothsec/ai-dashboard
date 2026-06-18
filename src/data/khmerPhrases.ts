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