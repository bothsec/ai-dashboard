export interface RedFlagClause {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  khLabel: string;
  enLabel: string;
  khExplanation: string;
  enExplanation: string;
  /** regex pattern to detect this clause */
  pattern: string;
  /** field name / section name typical of this clause */
  sections: string[];
}

export const RED_FLAG_CLAUSES: RedFlagClause[] = [
  {
    id: 'unpaid-overtime',
    severity: 'critical',
    khLabel: 'ទទួលរំពឹងបន្ថែមម៉ោងលើស',
    enLabel: 'Unpaid Overtime',
    khExplanation: 'ប្រាក់រង្វាន់លើសម៉ោង (overtime) គឺជាការទាមទារតាមច្បាប់ការងារកម្ពុជា ។ ប្រសិនបើកិច្ចសន្យាមិនបញ្ជាក់ ឬ បដិសេធមិនបង់ នេះគឺខុសច្បាប់ ។',
    enExplanation: 'Overtime pay is legally required under Cambodia\'s Labor Law. A contract that does not mention overtime pay or explicitly waives it violates the law.',
    pattern: 'overtime|OT|hours?|extra hour|no overtime|unpaid',
    sections: ['overtime', 'compensation', 'salary', 'benefits', 'working hours'],
  },
  {
    id: 'no-sick-leave',
    severity: 'critical',
    khLabel: 'គ្មានសំេាកឈ ឺមិនបា នឱ នារី',
    enLabel: 'No Sick Leave',
    khExplanation: 'ការងា រតា មច្បា ប់ កម្ពុ ជ ា ទ ទ ួ ល រ ង ន ់ ៦ ថ ប ល ើ ស / ឆ្ន ា ឆ ន ទ ា ន ន ា ៦ ខ គ ប ើ ស / ម ួ យ ខ គ ។',
    enExplanation: 'Cambodia\'s Labor Law guarantees 6 sick days per year with pay, and 1 day per month for unpaid sick leave. A contract that denies sick leave is illegal.',
    pattern: 'no sick|sick leave denied|no paid sick|forfeit sick',
    sections: ['leave', 'sick', 'benefits', 'paid leave'],
  },
  {
    id: 'no-13-month',
    severity: 'critical',
    khLabel: 'គ្មា ន ប្រ ា ក យ 13 ខ គ',
    enLabel: 'No 13th-Month Bonus',
    khExplanation: 'ប្រ ា ក យ 13 ខ គ (annual bonus) គ ឺ ក ា រ ទ ទ ួ ល រ ង ន ត ា ម ច ្ ប ា ប់ ក ា រ ង ា រ ។ ន ិ យ ា យ ត ា ម ច ្ ប ា ប់ រ ។',
    enExplanation: 'The 13th-month bonus (one month\'s salary) is a legal entitlement under Cambodia\'s Labor Law for employees who have worked at least one year.',
    pattern: '13th month|thirteenth|annual bonus|no bonus|13 th',
    sections: ['bonus', 'salary', 'compensation', 'benefits', '13th'],
  },
  {
    id: 'no-severance',
    severity: 'critical',
    khLabel: 'គ ្ ម ា ន ប្ រ ា ក យ រ ល ុ ង ប ញ ុ ង',
    enLabel: 'No Severance Pay',
    khExplanation: 'ន ិ យ ា យ ត ា ម ច ្ ប ា ប ច ្ ប ា ប ើ ស រ ប ញ ុ ង ន ិ យ ា យ ត ា ម ច ្ ប ា ប ា ង ច ុ ង ល ើ ស ឬ រ ប ញ ុ ង អ ស ឋ ា យ ល ើ ស ។',
    enExplanation: 'Severance pay is mandatory under Cambodia\'s Labor Law for dismissals without just cause. The rate depends on length of service (minimum 30 days wages per year).',
    pattern: 'no severance|waive severance|forfeit severance|relinquish severance|severance denied',
    sections: ['termination', 'severance', 'dismissal', 'end of employment', 'compensation'],
  },
  {
    id: 'foreign-currency-pay',
    severity: 'high',
    khLabel: 'ប ង ដ ល ្ រ ក យ ជ ា ង ប រ ទេ ស',
    enLabel: 'Salary in Foreign Currency',
    khExplanation: 'ប្រ ា ក យ ត ើ ម ប ង ដ ល ន ៅ ប ង ដ ជ ា ង ប រ ទេ ស (USD, THB, etc.) ផ ង ទ ា ប ា ន ន ា ង ល ើ ស ទេ ស ត ា ម ច ្ ប ា ប ់ ។',
    enExplanation: 'Paying salary in foreign currency is restricted in Cambodia. Employers must pay in Khmer Riel (KHR) or USD at the prevailing rate — paying exclusively in THB or other foreign currency may violate exchange control regulations.',
    pattern: 'pay.*USD|salary.*USD|paid in USD|salary.*THB|paid.*Thai|remit.*abroad',
    sections: ['salary', 'payment', 'currency', 'remuneration', 'compensation'],
  },
  {
    id: 'unilateral-contract',
    severity: 'high',
    khLabel: 'ប ង ហ ា រ ព ី ខ ក ច ុ ង ដ ោ យ ថ ា ន ុ ត ល',
    enLabel: 'Employer Can Change Contract Unilaterally',
    khExplanation: 'ប ង ហ ា រ ព ី អ ា ច ផ ង ផ ល ប់ ប ង ដ ន ់ ខ ច ុ ង ដ ល ើ ស (ប ង រ ង ដ ់ ប ង ប ា ន) ន ោ ច ច ប ន ់ ដ ទ ល ់ ម ា ន ភ ា ព គ ួ ន ។',
    enExplanation: 'A contract that allows the employer to modify terms unilaterally (hours, salary, duties, location) without the employee\'s consent is an unfair clause under Cambodian labor law.',
    pattern: 'modify at|change at|amend at|employer.*right.*change|unilateral|at our discretion|at the company',
    sections: ['amendment', 'modification', 'changes', 'terms', 'conditions', 'employer rights'],
  },
  {
    id: 'indefinite-probation',
    severity: 'high',
    khLabel: 'Probation ម ិ ន ក ប ា ត ក ា ល',
    enLabel: 'Excessively Long or Undefined Probation',
    khExplanation: 'Probation ត ើ ម ត ើ ម ផ ង ត ើ ម ម ិ ន ល ើ ស 3 ខ គ ។ Probation ដ ល ើ ស 3 ខ គ ឬ ម ិ ន ប ា ន ក ប ា ត ក ា ល គ ឺ ខ ុ ស ច ្ ប ា ប ់ ។',
    enExplanation: 'Under Cambodia\'s Labor Law, the probationary period cannot exceed 3 months. A contract with an indefinite or longer probation period is illegal.',
    pattern: 'probation.*6|6.*month.*probation|probation.*year|extend.*probation|no maximum probation|indefinite probation',
    sections: ['probation', 'trial period', 'trial', 'assessment'],
  },
  {
    id: 'deposit-forfeit',
    severity: 'high',
    khLabel: 'ទ ទ ួ ល រ ង ន ប ា ន ធ ន ា ល',
    enLabel: 'Security Deposit / Forfeiture Clause',
    khExplanation: 'ក ា រ ទ ទ ួ ល ប ន ់ ធ ន ា ល (deposit) ត ើ ម ប ង ហ ា រ ព ី គ ឺ ខ ុ ស ច ្ ប ា ប ់ ។ ប ន ់ ធ ន ា ល ន ិ យ ា យ ត ា ម ច ្ ប ា ប ់ ជ ា ង ក ម ន ់ ន ់ ប ង ផ ង ត ើ ម យ ក ច ុ ង ដ ។',
    enExplanation: 'A contract that requires the employee to pay a security deposit that can be forfeited for quitting early or for any "breach" is an illegal fee under Cambodia\'s Labor Law.',
    pattern: 'deposit|security bond|bond|forfeit|guarantee deposit|training bond|placement fee',
    sections: ['deposit', 'bond', 'fee', 'guarantee', 'security', 'training', 'placement'],
  },
  {
    id: 'penalty-quit',
    severity: 'high',
    khLabel: '� ង ទ ា ន ទ ណ ី រ ប ង ់ ប ញ ុ ង',
    enLabel: 'Penalty for Quitting',
    khExplanation: 'ក ា រ ផ ង ទ ា ន ទ ណ ី រ ប ង ់ ប ញ ុ ង (penalty) ប ា ន ឱ ទ ប ក ា រ ង ា រ ល ើ ស 3 ខ គ ន ោ ព ី រ ដ ោ យ ឱ ទ ប ប ង ហ ា រ ព ី ។',
    enExplanation: 'Requiring the employee to pay a penalty for resigning (beyond 1 month\'s notice for blue-collar workers) is illegal under Cambodia\'s Labor Law.',
    pattern: 'penalty.*quit|penalty.*resign|penalty.*terminate|breach.*penalty|liquidated.*damage|early termination.*fee',
    sections: ['termination', 'resignation', 'penalty', 'breach', 'damages', 'notice'],
  },
  {
    id: 'no-notice-period',
    severity: 'medium',
    khLabel: 'គ ្ ម ា ន រ យ ក ា ល ជ ូ ន',
    enLabel: 'No Notice Period',
    khExplanation: 'ក ា រ ង ា រ ត ើ ម ម ិ ន ប ា ន ក ប ា ត រ យ ក ា ល ជ ូ ន ប ា ន ឱ ទ ប ក ា រ ង ា រ ល ើ ស 1 ខ គ ស ម ត ុ ល ើ ស 3 ខ គ ។',
    enExplanation: 'Both employer and employee must observe a notice period before terminating an indefinite contract (1 month for blue-collar, 3 months for white-collar). Waiving the notice period is an unfair clause.',
    pattern: 'no notice|waive.*notice|terminate immediately|without.*notice|immediate termination|no notice period',
    sections: ['notice', 'termination', 'resignation', 'end of contract'],
  },
  {
    id: 'excessive-working-hours',
    severity: 'high',
    khLabel: 'ម ៉ ង ង ា រ ល ើ ស 8 ម ប ទ ី',
    enLabel: 'Excessive Working Hours',
    khExplanation: 'ម ៉ ង ង ា រ ត ើ ម 8 ម ប ទ ី / ថ ប ល ើ ស (48h/week + 4h OT max) គ ឺ ខ ុ ស ច ្ ប ា ប ់ ។ ម ៉ ង ង ា រ ថ ប ល ើ ស 4 ម ប ទ ី / ថ ប ល ើ ស ផ ង ត ើ ម ទ ទ ួ ល ប ា ន ន ា ។',
    enExplanation: 'Normal working hours are capped at 8 hours/day or 48 hours/week. Overtime is capped at 4 hours/day. Any contract requiring more is illegal and violates Labor Law.',
    pattern: '10 hours?|12 hours?|14 hours?|16 hours?|shift.*12|no limit.*hour|exceed.*hour',
    sections: ['working hours', 'hours', 'shifts', 'schedule', 'workweek'],
  },
  {
    id: 'no-written-contract',
    severity: 'critical',
    khLabel: 'គ ្ ម ា ន ក ិ ច ច ស ន យ ា ស រ ព ី',
    enLabel: 'No Written Contract',
    khExplanation: 'ក ិ ច ច ស ន យ ា ស រ ព ី ត ើ ម ប ង ផ ង ត ើ ម ប ា ន ន ា ជ ា ង ស រ ព ី ដ ើ ្ ន ប ា ន ។',
    enExplanation: 'Any employment contract for more than 1 month must be in writing under Cambodia\'s Labor Law. Verbal-only contracts deny the worker legal protection.',
    pattern: 'verbal|oral|not in writing|no written|no contract|handshake|agreement only',
    sections: ['contract type', 'agreement', 'terms', 'written'],
  },
  {
    id: 'no-insurance',
    severity: 'medium',
    khLabel: 'គ ្ ម ា ន ធ ា ន ស ុ ខ ា ច ុ ី',
    enLabel: 'No Health/Social Insurance',
    khExplanation: 'ន ិ យ ា យ ត ា ម ច ្ ប ា ប ់ ប ង ហ ា រ ព ី ត ើ ម ប ង ផ ង ត ើ ម ច ុ ី ប ញ ុ ង NSSF (National Social Security Fund) ។',
    enExplanation: 'Employers are legally required to register employees with the National Social Security Fund (NSSF) for healthcare and occupational accident coverage.',
    pattern: 'no insurance|no NSSF|not registered|exclude.*insurance|waive.*benefits',
    sections: ['insurance', 'NSSF', 'social security', 'health', 'benefits', 'registration'],
  },
  {
    id: 'no- annual-leave',
    severity: 'medium',
    khLabel: 'គ ្ ម ា ន ច ន ល ទ ប ា រ ី',
    enLabel: 'No Annual Leave',
    khExplanation: 'ប ង ហ ា រ ព ី ត ើ ម ប ង ផ ង ត ើ ម ផ ង ទ ា ន ច ន ល ទ ប ា រ ី យ ួ ល 18 ថ ប ល ើ ស ក ន ី ត ើ ម ប ង ។',
    enExplanation: 'Workers with 1 year of service are legally entitled to a minimum of 18 working days of paid annual leave. Contracts that waive annual leave are illegal.',
    pattern: 'no annual|no vacation|no paid leave|forfeit.*leave|waive.*annual|leave.*not included',
    sections: ['leave', 'vacation', 'annual leave', 'paid leave', 'holiday'],
  },
  {
    id: 'confiscate-documents',
    severity: 'critical',
    khLabel: 'រ ឹ ប អ ួ ន ឯ ក ស ា ច',
    enLabel: 'Confiscation of Personal Documents',
    khExplanation: 'ក ា រ រ ឹ ប អ ួ ន ឯ ក ស ា ច (passport, ID) គ ឺ ខ ុ ស ច ្ ប ា ប ់ យ ួ ល 11 រ ។',
    enExplanation: 'Confiscating an employee\'s passport, ID, or other personal documents is a criminal offense under Cambodia\'s Labor Law and is associated with human trafficking.',
    pattern: 'surrender.*passport|keep.*passport|confiscate|id.*hold|original.*document',
    sections: ['documents', 'passport', 'ID', 'identification', 'papers'],
  },
];

export interface DetectedClause {
  clause: RedFlagClause;
  matchedText: string;
  section: string;
}

/**
 * Scans text for red flag contract clauses.
 * Returns detected clauses with the matched text and inferred section.
 */
export function detectContractClauses(text: string): DetectedClause[] {
  const results: DetectedClause[] = [];

  for (const clause of RED_FLAG_CLAUSES) {
    const re = new RegExp(clause.pattern, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      // Find the closest section by looking at text near the match
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + match[0].length + 80);
      const snippet = text.slice(start, end);

      // Find the closest section name from the clause.sections
      let bestSection = 'general';
      for (const sec of clause.sections) {
        if (snippet.toLowerCase().includes(sec.toLowerCase())) {
          bestSection = sec;
          break;
        }
      }

      results.push({
        clause,
        matchedText: match[0],
        section: bestSection,
      });
    }
  }

  return results;
}