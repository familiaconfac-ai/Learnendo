import type { TeacherProfile, TeacherStatus, LanguageCode, UserRole, LanguagePermissions } from '../types';

const STORE_KEY = 'lab_teacher_profiles';

// ─── Permission helpers ───────────────────────────────────────────────────────

const LANG_PERMISSION_MAP: Record<LanguageCode, keyof LanguagePermissions> = {
  en: 'canEditEnglish',
  pt: 'canEditPortuguese',
  es: 'canEditSpanish',
  el: 'canEditGreek',
  he: 'canEditHebrew',
};

function buildPermissions(languages: LanguageCode[], canEditBible: boolean): LanguagePermissions {
  const base: LanguagePermissions = {
    canEditEnglish: false,
    canEditPortuguese: false,
    canEditSpanish: false,
    canEditGreek: false,
    canEditHebrew: false,
    canEditBible,
  };
  for (const lang of languages) {
    const key = LANG_PERMISSION_MAP[lang];
    if (key) base[key] = true;
  }
  return base;
}

// ─── Mock seed data ──────────────────────────────────────────────────────────

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const MOCK_TEACHERS: TeacherProfile[] = [
  {
    id: 'tp-001',
    name: 'Ana Costa',
    email: 'ana.costa@example.com',
    whatsapp: '+55 11 99999-0001',
    languages: ['pt', 'en'],
    canEditBible: false,
    status: 'approved',
    role: 'verified_editor',
    permissions: buildPermissions(['pt', 'en'], false),
    createdAt: NOW - 30 * DAY,
    approvedAt: NOW - 28 * DAY,
    approvedBy: 'admin',
  },
  {
    id: 'tp-002',
    name: 'Marco Silva',
    email: 'marco.silva@example.com',
    whatsapp: '+55 21 98888-0002',
    languages: ['es', 'pt'],
    canEditBible: false,
    status: 'pending',
    role: 'teacher',
    permissions: buildPermissions([], false),
    createdAt: NOW - 2 * DAY,
  },
  {
    id: 'tp-003',
    name: 'Rev. David Levi',
    email: 'david.levi@example.com',
    languages: ['he', 'en'],
    canEditBible: true,
    status: 'approved',
    role: 'verified_editor',
    permissions: buildPermissions(['he', 'en'], true),
    createdAt: NOW - 60 * DAY,
    approvedAt: NOW - 58 * DAY,
    approvedBy: 'admin',
  },
  {
    id: 'tp-004',
    name: 'Sofia Papadaki',
    email: 'sofia@example.com',
    whatsapp: '+30 69 1234 5678',
    languages: ['el'],
    canEditBible: false,
    status: 'pending',
    role: 'teacher',
    permissions: buildPermissions([], false),
    createdAt: NOW - 1 * DAY,
  },
  {
    id: 'tp-005',
    name: 'Carlos Mendez',
    email: 'carlos@example.com',
    languages: ['es', 'pt'],
    canEditBible: false,
    status: 'rejected',
    role: 'viewer',
    permissions: buildPermissions([], false),
    createdAt: NOW - 10 * DAY,
    approvedBy: 'admin',
    note: 'Application incomplete — no verifiable credentials submitted.',
  },
];

// ─── Storage ──────────────────────────────────────────────────────────────────

function load(): TeacherProfile[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return MOCK_TEACHERS;
    return JSON.parse(raw);
  } catch {
    return MOCK_TEACHERS;
  }
}

function save(profiles: TeacherProfile[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(profiles));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTeacherProfiles(): TeacherProfile[] {
  return load();
}

export function saveTeacherProfile(profile: TeacherProfile): void {
  const all = load();
  const idx = all.findIndex((p) => p.id === profile.id);
  if (idx !== -1) {
    all[idx] = profile;
  } else {
    all.unshift(profile);
  }
  save(all);
}

export function approveTeacher(
  id: string,
  approvedBy: string,
  roleToGrant: UserRole = 'verified_editor',
): void {
  const all = load();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const p = all[idx];
  const updatedPermissions = buildPermissions(p.languages, p.canEditBible);
  all[idx] = {
    ...p,
    status: 'approved',
    role: roleToGrant,
    permissions: updatedPermissions,
    approvedAt: Date.now(),
    approvedBy,
  };
  save(all);
}

export function rejectTeacher(id: string, approvedBy: string, note?: string): void {
  const all = load();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], status: 'rejected', role: 'viewer', approvedBy, note: note ?? all[idx].note };
  save(all);
}

export function updateTeacherStatus(id: string, status: TeacherStatus): void {
  const all = load();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], status };
  save(all);
}

export function countPendingTeachers(): number {
  return load().filter((p) => p.status === 'pending').length;
}

export const ROLE_DISPLAY: Record<UserRole, string> = {
  viewer: 'Viewer',
  teacher: 'Teacher',
  verified_editor: 'Verified Editor ✓',
  admin: 'Admin',
};

export const STATUS_DISPLAY: Record<TeacherStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const LANG_FLAG: Record<LanguageCode, string> = {
  en: '🇬🇧',
  pt: '🇧🇷',
  es: '🇪🇸',
  el: '🇬🇷',
  he: '🇮🇱',
};
