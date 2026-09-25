import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const teacher = read('src/components/LiveClasses/Teacher/TeacherRoomView.tsx');
const student = read('src/components/LiveClasses/Student/StudentRoomView.tsx');
const tokenApi = read('api/getToken.ts');
const mediaPolicy = read('src/services/liveMediaPolicy.ts');
const viteConfig = read('vite.config.ts');
const rules = read('../../firestore.rules');

assert.doesNotMatch(teacher, /if \(!token \|\| !wsUrl\) return;\s*void ensureLiveRoomConnected\(\)/);
assert.doesNotMatch(student, /if \(!token \|\| !wsUrl\) return;\s*void ensureLiveRoomConnected\(\)/);
assert.match(teacher, /mediaTransport: 'livekit-connecting'/);
assert.match(teacher, /teacherScreenShareEnabled: true/);
assert.match(teacher, /LIVE_MEDIA_GRACE_PERIOD_MS/);
assert.match(teacher, /anyStudentMediaActive/);
assert.match(teacher, /mediaTransport: 'meet'/);
assert.match(student, /shouldConnectForTransport\(session\.mediaTransport\)/);
assert.match(student, /Áudio\/vídeo já está ativo em outra aba/);
assert.match(tokenApi, /verifyIdToken\(requireLiveKitBearerToken/);
assert.match(tokenApi, /const room = `learnendo-live-\$\{classId\}`/);
assert.match(tokenApi, /buildAuthorizedLiveKitIdentity\(role, decoded\.uid\)/);
assert.doesNotMatch(tokenApi, /rawBody\.room/);
assert.doesNotMatch(tokenApi, /rawBody\.participantIdentity/);
assert.doesNotMatch(mediaPolicy, /mainStageMode/);
assert.doesNotMatch(viteConfig, /body\.participantIdentity|body\.room/);
assert.match(rules, /match \/mediaParticipants\/\{uid\}/);
assert.match(rules, /request\.auth\.uid == uid/);
assert.match(rules, /match \/mediaTelemetry\/\{eventId\}/);

console.log('live media on-demand source checks passed');
