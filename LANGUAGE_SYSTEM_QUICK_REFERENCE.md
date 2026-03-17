# Language System - Quick Reference

## Global State in App.tsx

```typescript
// ===== LANGUAGE STATE =====
const [language, setLanguageState] = useState<LessonLanguageCode>(() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LessonLanguageCode | null;
    if (stored && ['en', 'pt', 'es', 'el', 'he'].includes(stored)) {
      return stored;
    }
  }
  return DEFAULT_LANGUAGE;
});

const setLanguage = useCallback((newLanguage: LessonLanguageCode) => {
  console.log('[App] Language changed:', newLanguage);
  setLanguageState(newLanguage);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
  }
  const courseForLanguage = LANGUAGE_TO_COURSE[newLanguage];
  if (courseForLanguage) {
    setCurrentCourseId(courseForLanguage);
  }
}, []);
```

## Constants

```typescript
const LANGUAGE_STORAGE_KEY = 'learnendo_user_language';  // localStorage key
const DEFAULT_LANGUAGE = 'en' as LessonLanguageCode;      // Default: English

// Language ↔ Course Mapping
const COURSE_TO_LANGUAGE: Record<string, LessonLanguageCode> = {
  'english': 'en',
  'portuguese_foreigners': 'pt',
  'portuguese_native': 'pt',
  'spanish': 'es',
  'greek_koine': 'el',
  'hebrew_biblical': 'he',
};

const LANGUAGE_TO_COURSE: Record<LessonLanguageCode, string> = {
  'en': 'english',
  'pt': 'portuguese_foreigners',
  'es': 'spanish',
  'el': 'greek_koine',
  'he': 'hebrew_biblical',
};
```

## Supported Languages

| Code | Name | Flag |
|------|------|------|
| `en` | English | 🇺🇸 |
| `pt` | Portuguese | 🇧🇷 |
| `es` | Spanish | 🇪🇸 |
| `el` | Greek | 🇬🇷 |
| `he` | Hebrew | 🇮🇱 |

## Passing Language to Components

### From App.tsx to CoursesView
```typescript
<CoursesView
  courses={COURSES}
  currentCourseId={currentCourseId}
  currentLanguage={language}
  onLanguageChange={setLanguage}
  onSelectCourse={(id) => handleCourseChange(id)}
/>
```

### From App.tsx to PlacementTest
```typescript
<PlacementTest 
  currentLanguage={language} 
  onComplete={handlePlacementComplete} 
  onTriggerConversion={triggerConversion} 
/>
```

### From App.tsx to LessonView
```typescript
<LessonView
  lesson={lesson}
  lessonNumber={lessonNumber}
  progress={progress}
  currentLanguage={language}
  isAdmin={isAdmin}
  // ... other props
/>
```

### From App.tsx to ExercisePractice
```typescript
<ExercisePractice
  day={currentDay}
  lessonId={currentLessonId || ''}
  currentLanguage={language}
  progress={progress}
  onComplete={handleDayComplete}
  onBack={() => {...}}
/>
```

## Adding Language to New Component

**1. Update interface:**
```typescript
interface MyComponentProps {
  currentLanguage?: LessonLanguageCode;
  // ... other props
}
```

**2. Destructure with default:**
```typescript
export const MyComponent: React.FC<MyComponentProps> = ({ 
  currentLanguage = 'en',
  // ... other props
}) => {
```

**3. Use in component:**
```typescript
const config = {
  'en': { title: 'English Title' },
  'pt': { title: 'Título em Português' },
  'es': { title: 'Título en Español' },
  'el': { title: 'Τίτλος στα ελληνικά' },
  'he': { title: 'כותרת בעברית' },
};

const text = config[currentLanguage]?.title || config['en'].title;
```

## useCallback for Course Sync

```typescript
const handleCourseChange = useCallback((courseId: string) => {
  setCurrentCourseId(courseId);
  const languageForCourse = COURSE_TO_LANGUAGE[courseId];
  if (languageForCourse && languageForCourse !== language) {
    setLanguage(languageForCourse);
  }
}, [language, setLanguage]);
```

## localStorage Operations

### Get current language
```javascript
localStorage.getItem('learnendo_user_language')  // Returns: 'en', 'pt', 'es', 'el', 'he'
```

### Set language
```javascript
localStorage.setItem('learnendo_user_language', 'pt')
```

### Clear language (reset to default)
```javascript
localStorage.removeItem('learnendo_user_language')
```

## Header Badge Display

```tsx
<span className="rounded-lg bg-blue-100 text-blue-700 px-1.5 py-1" title="Current Language">
  {language.toUpperCase()}
</span>
```

Shows: **EN**, **PT**, **ES**, **EL**, or **HE**

## Typical Workflow

### User Changes Language
```
1. User clicks Portuguese flag in course selector
2. handleCourseChange('portuguese_foreigners') called
3. setCurrentCourseId('portuguese_foreigners')
4. COURSE_TO_LANGUAGE['portuguese_foreigners'] = 'pt'
5. setLanguage('pt') called:
   - setLanguageState('pt')
   - localStorage.setItem('learnendo_user_language', 'pt')
   - setCurrentCourseId('portuguese_foreigners') [already set, but ensures sync]
6. Component tree re-renders with language='pt'
7. All child components receive currentLanguage='pt'
8. Header badge updates to show "PT"
```

### User Refreshes Page
```
1. App.tsx mounts
2. useState factory runs
3. localStorage.getItem('learnendo_user_language') → 'pt'
4. State initializes to 'pt'
5. Page renders with Portuguese language
6. Header badge shows "PT"
7. Course is Portuguese
```

## Type Definitions

```typescript
// From types.ts
export type LessonLanguageCode = 'en' | 'pt' | 'es' | 'el' | 'he';

// Language interface (if needed)
interface Language {
  code: LessonLanguageCode;
  name: string;
  flag: string;
  course: string;
}
```

## Examples of Language Usage

### Conditional Rendering
```typescript
{currentLanguage === 'pt' && <PortugueseContent />}
{currentLanguage === 'en' && <EnglishContent />}
```

### Language-Specific Styling
```typescript
const isRtl = currentLanguage === 'he' || currentLanguage === 'el';
return <div dir={isRtl ? 'rtl' : 'ltr'}> ... </div>;
```

### Language Selection Function
```typescript
const getLocalizedString = (key: string, lang: LessonLanguageCode) => {
  const translations: Record<LessonLanguageCode, Record<string, string>> = {
    'en': { greeting: 'Hello' },
    'pt': { greeting: 'Olá' },
    'es': { greeting: 'Hola' },
    'el': { greeting: 'Γεια σας' },
    'he': { greeting: 'שלום' },
  };
  return translations[lang]?.[key] ?? translations['en'][key];
};
```

## Debugging

### Check current language
```javascript
// In browser console
const lang = localStorage.getItem('learnendo_user_language');
console.log('Currently set to:', lang);
```

### Check React state (with React DevTools)
1. Open React DevTools
2. Find App component
3. Look at `language` state
4. Check `setLanguage` function

### Verify localStorage
```javascript
// In browser console
Object.keys(localStorage).filter(k => k.includes('language'))
// Should show: ['learnendo_user_language']

localStorage.getItem('learnendo_user_language')
// Should show: 'en', 'pt', 'es', 'el', or 'he'
```

### Monitor changes
```javascript
// In browser console
window.addEventListener('storage', (e) => {
  if (e.key === 'learnendo_user_language') {
    console.log('Language changed to:', e.newValue);
  }
});
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Language not persisting | Check localStorage enabled, verify key names match |
| Component not showing language | Add currentLanguage prop to component interface |
| Language badge not updating | Check header code receives language prop |
| Wrong course selected | Verify LANGUAGE_TO_COURSE mapping |
| Language resets on reload | Check localStorage initialization in useState |

## Files Involved

```
apps/main/
├── src/
│   ├── App.tsx                           ← Main language state
│   ├── types.ts                          ← LessonLanguageCode type
│   └── components/
│       ├── CoursesView/CoursesView.tsx   ← language prop
│       ├── PlacementTest/PlacementTest.tsx
│       ├── LessonView/LessonView.tsx
│       └── ExercisePractice/ExercisePractice.tsx

apps/wbk-5/
└── (identical structure)
```

## Validation

Both apps pass TypeScript:
```bash
npm run lint
# ✅ Zero errors
```

## Git History

- Commit ac7be5c: Language system implementation
- Commit 850704b: Documentation added

---

**Quick Links:**
- Full guide: [LANGUAGE_SYSTEM_GUIDE.md](./LANGUAGE_SYSTEM_GUIDE.md)
- App architecture: App.tsx
- Types: types.ts

