import { User, ImportStagingRecord } from '../types';

export interface StagingSourceItem {
  raw_id: number;
  employee_name: string;
  personal_phone: string;
  office_phone: string | null;
  handwriting_notes?: string;
  confidence: 'high' | 'medium_ambiguous' | 'low';
}

/**
 * Transcription of the handwritten employee sheet (15 records).
 * IMPORTANT: As instructed, this is treated as unverified pending review.
 * Any unclear handwriting digits are documented with notes.
 */
export const RAW_HANDWRITTEN_EMPLOYEE_STAGING: StagingSourceItem[] = [
  {
    raw_id: 1,
    employee_name: 'Karthik Mani',
    personal_phone: '9500788897',
    office_phone: null,
    handwriting_notes: 'Manager account. Name legible as Karthik Mani/Muni. Office phone left blank/NULL.',
    confidence: 'high',
  },
  {
    raw_id: 2,
    employee_name: 'Pandiya Raj',
    personal_phone: '9894685438',
    office_phone: '8463980327',
    handwriting_notes: 'Legible. Matches Pandiyaraj Subramani.',
    confidence: 'high',
  },
  {
    raw_id: 3,
    employee_name: 'Bhavani',
    personal_phone: '9591268897',
    office_phone: null,
    handwriting_notes: 'Office phone left blank/NULL. Matches Bhavani N.',
    confidence: 'high',
  },
  {
    raw_id: 4,
    employee_name: 'Varsha Sree J',
    personal_phone: '8008734601',
    office_phone: '8142676308',
    handwriting_notes: 'Legible. Matches Varsha sree in CRM.',
    confidence: 'high',
  },
  {
    raw_id: 5,
    employee_name: 'Dhanalakshmi S',
    personal_phone: '8778285890',
    office_phone: '9631420130',
    handwriting_notes: 'Legible. Matches S Dhanalakshmi.',
    confidence: 'high',
  },
  {
    raw_id: 6,
    employee_name: 'Aswini G',
    personal_phone: '9123588603',
    office_phone: '8696827197',
    handwriting_notes: 'Legible. Matches Aswini. G.',
    confidence: 'high',
  },
  {
    raw_id: 7,
    employee_name: 'Arthi P',
    personal_phone: '7639920834',
    office_phone: '7285983828',
    handwriting_notes: 'Legible. Matches Arthi P.',
    confidence: 'high',
  },
  {
    raw_id: 8,
    employee_name: 'S. Sravanthi',
    personal_phone: '8639200600',
    office_phone: '7287098647',
    handwriting_notes: 'AMBIGUITY FLAGGED: Handwritten personal phone has digit "2" or "7" (8639200600 vs CRM database 8639700600). Do not silently overwrite without review.',
    confidence: 'medium_ambiguous',
  },
  {
    raw_id: 9,
    employee_name: 'Santhosh Kumar',
    personal_phone: '7676610021',
    office_phone: '8501949643',
    handwriting_notes: 'Legible. Matches SANTHOSH KUMAR.',
    confidence: 'high',
  },
  {
    raw_id: 10,
    employee_name: 'Vidhyalakshmi B',
    personal_phone: '6379068840',
    office_phone: '8142319293',
    handwriting_notes: 'Phone matches 6379068840. Initial written as B; CRM account has Vidhyalakshmi S.',
    confidence: 'high',
  },
  {
    raw_id: 11,
    employee_name: 'Anupriya S',
    personal_phone: '9123569028',
    office_phone: '7095641088',
    handwriting_notes: 'Legible. Matches Anupriya.S.',
    confidence: 'high',
  },
  {
    raw_id: 12,
    employee_name: 'Stella H',
    personal_phone: '8870801191',
    office_phone: '8465904989',
    handwriting_notes: 'AMBIGUITY FLAGGED: Last digit of personal phone looks like 1 or 7 (8870801191 vs CRM database 8870801197). Office phone is clearly 8465904989.',
    confidence: 'medium_ambiguous',
  },
  {
    raw_id: 13,
    employee_name: 'Pavanasan K',
    personal_phone: '8778405700',
    office_phone: '7659823167',
    handwriting_notes: 'AMBIGUITY FLAGGED: Handwritten name looks like Pavanasan / Poovarasan. Phone digit "0" vs "9" (8778405700 vs CRM 8778495100). Needs manual confirmation.',
    confidence: 'medium_ambiguous',
  },
  {
    raw_id: 14,
    employee_name: 'G. Madan Kumar',
    personal_phone: '9384586321',
    office_phone: '9160676958',
    handwriting_notes: 'Legible. Matches Madhan.G (9384586321).',
    confidence: 'high',
  },
  {
    raw_id: 15,
    employee_name: 'A. Praveen Kumar',
    personal_phone: '9360777279',
    office_phone: '7036127666',
    handwriting_notes: 'Legible. Matches Praveen (9360777279).',
    confidence: 'high',
  },
];

/**
 * Normalizes phone number strings to 10-digit format
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Computes live match status for each staging item against current CRM users.
 * Does NOT match solely by name; uses phone normalization, verified accounts, or manual flags.
 */
export function buildStagingRecords(users: User[]): ImportStagingRecord[] {
  return RAW_HANDWRITTEN_EMPLOYEE_STAGING.map((item) => {
    const rawPersonal = normalizePhone(item.personal_phone);
    const officePhone = item.office_phone ? normalizePhone(item.office_phone) : null;

    // Search for match in existing users
    const matchedUser = users.find((u) => {
      // Karthik manager match
      if (item.raw_id === 1 && (u.email === 'karthik@time2trade.com' || u.id === '10000000-0000-0000-0000-000000000001')) {
        return true;
      }

      // Check phone match
      const userPhone = normalizePhone(u.phone || u.personal_phone || u.personal_number);
      if (rawPersonal && userPhone && userPhone === rawPersonal) {
        return true;
      }

      // Sravanthi handwriting digit 2 vs 7 match
      if (item.raw_id === 8 && (userPhone === '8639700600' || u.email?.includes('sravanthi'))) {
        return true;
      }

      // Stella handwriting digit 1 vs 7 match
      if (item.raw_id === 12 && (userPhone === '8870801197' || u.email?.includes('stella'))) {
        return true;
      }

      // Poovarasan handwriting match
      if (item.raw_id === 13 && (userPhone === '8778495100' || u.email?.includes('poovarasan'))) {
        return true;
      }

      return false;
    });

    let status: ImportStagingRecord['status'] = 'matched';
    let notes = item.handwriting_notes || '';

    if (item.confidence === 'medium_ambiguous') {
      status = 'needs_review';
    } else if (!matchedUser) {
      status = 'new';
    } else if (matchedUser && matchedUser.office_phone && normalizePhone(matchedUser.office_phone) === officePhone) {
      status = 'imported';
      notes = 'Already imported and up to date.';
    }

    return {
      id: `stg-${item.raw_id}`,
      raw_id: item.raw_id,
      employee_name: item.employee_name,
      personal_phone: item.personal_phone,
      office_phone: item.office_phone,
      matched_user_id: matchedUser ? matchedUser.id : null,
      matched_user_name: matchedUser ? matchedUser.name : null,
      status,
      notes,
    };
  });
}
