/**
 * Job Quick Replies — one-tap professional Khmer phrases for common job-seeker scenarios.
 * Designed for Cambodian job seekers who need help composing professional messages.
 */
export interface QuickReply {
  id: string;
  label: string;       // short label shown on button (English)
  kh: string;          // Khmer phrase
  scenario: string;    // e.g. "greeting" | "application" | "followup" | "salary" | "thanks"
}

export const QUICK_REPLIES: QuickReply[] = [
  // Greeting
  {
    id: 'gr1',
    label: 'Greet',
    kh: 'សួស្តី លោក/លោកស្រី! ខ្ញុំមានក ារពេញចិត្តក្នុ ងការជេ រប្រ ា ស្រ ័ យ ទ ា ក ់ ទ ង ត ំ ណ ែ ង នេ ះ ។',
    scenario: 'greeting',
  },
  // Application
  {
    id: 'ap1',
    label: 'Apply',
    kh: 'ខ្ញ ុ ំ ច ង ច ូ ល ព ា ក ្ យ ស ្ ន ើ ស ុ ំ ត ំ ណ ែ ង នេ ះ [ត ំ ណ ែ ង] នេ ះ ។ ខ ្ ញ ុ ំ ម ា ន ប ទ ព ិ ស ង ធ ន ៍ ន ិ ង [ច ំ ន ួ ន ឆ ្ ន ា ង] នៃ ក ា រ ង ា រ ។',
    scenario: 'application',
  },
  {
    id: 'ap2',
    label: 'Attach CV',
    kh: 'ខ ្ ញ ុ ំ ប ា ន ក ិ ច ច ទ ៀ ស ឯ ក ស រ ណ ៍ CV រ ប ស រ ប ស ង ជ ា ងល ោ ះ ។ ស ូ ម ទ ំ ន ិ ង ព ិ ភ ា ក ្ ស ៍ ព ី ធ ី រ ៍ ទ ុ ង ច ា ច ់ ។',
    scenario: 'application',
  },
  // Follow-up
  {
    id: 'fu1',
    label: 'Follow Up',
    kh: 'ខ ្ ញ ុ ំ ច ង ់ ធ ន ា រ ព ី ធ ី រ ៍ ទ ុ ង យ ៉ ា ហ ួ ម ន ឹ ង ដ ើ ម ្ ភ ា ព ិ ក ំ ណ ា ង ន ៃ ទ ី ប ំ ណ ជ ា ។',
    scenario: 'followup',
  },
  {
    id: 'fu2',
    label: 'Ask Status',
    kh: 'ស ូ ម ល ោ ះ ៈ ណ ា ធ ិ ក ំ ណ ា ង ន ៃ ទ ី ប ំ ណ ជ ា ន ិ ង [ត ំ ណ ែ ង] រ ប ស រ ។',
    scenario: 'followup',
  },
  // Salary
  {
    id: 'sa1',
    label: 'Salary Q',
    kh: 'ខ ្ ញ ុ ំ ស ូ ម ទ ំ ន ិ ង ស ួ ច ហ ា ហ រ ណ ៍ ទ ា ក ់ ព ី រ ប ប ា ន ក ិ ច ច រ ប ស រ ណ ៍ ប ្ រ ឪ ស រ ណ ៍ នេ ះ ។',
    scenario: 'salary',
  },
  {
    id: 'sa2',
    label: 'Negotiate',
    kh: 'ខ ្ ញ ុ ំ ស ូ ម ក ន ្ ត ី ច ូ ល ទ ៅ ន ៃ ទ ី ប ំ ណ ជ ា ន ិ ង ប ្ រ ឪ ស រ ណ ៍ $X ដ ល់ $Y ក ្ន ុ ង ខ ែ ិ ត ្ យ ប ្ រ ស ិ ទ ្ យ ។',
    scenario: 'salary',
  },
  // Accept
  {
    id: 'ac1',
    label: 'Accept',
    kh: 'ខ ្ ញ ុ ំ ព ិ រ ុ ប ទ ា ន ន ៃ ទ ី ប ំ ណ ជ ា ន ិ ង ត ំ ណ ែ ង នេ ះ ។ ខ ្ ញ ុ ំ ន ឹ ង ច ា ប ឋ ា ង ច ា ក ា រ ង ា រ ន ៅ [ថ ្ ង ំ ា] ។',
    scenario: 'accept',
  },
  // Decline
  {
    id: 'de1',
    label: 'Decline',
    kh: 'ខ ្ ញ ុ ំ ស ូ ម ទ ោ ន ិ ង ទ ា ក ់ ថ ្ ង ំ ា ថ ា ន ិ ត ប ា ន ក ្ ន ុ ង ក ា រ ង ា រ នេ ះ ។ ខ ្ ញ ុ ំ ស ូ ម ថ ្ គ ភ ិ ត ច ា រ រ ប ស រ ណ ៍ ព ី ធ ី រ ៍ ។',
    scenario: 'decline',
  },
  // Thanks
  {
    id: 'th1',
    label: 'Thank',
    kh: 'ស ូ ម អ រ គ ត ិ ច ា ច ់ ច្រ ័ យ ច ំ ន ិ ច រ ប ស រ ។ ខ ្ ញ ុ ំ ស ូ ម ថ ្ គ ភ ិ ត ច ា រ ។',
    scenario: 'thanks',
  },
];

export const SCENARIOS = ['greeting', 'application', 'followup', 'salary', 'accept', 'decline', 'thanks'] as const;