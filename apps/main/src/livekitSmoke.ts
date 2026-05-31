import { ConnectionState, Room } from 'livekit-client';

type LiveClassRole = 'teacher' | 'student';

interface LiveKitTokenResponse {
  token: string;
  url?: string;
  wsUrl?: string;
  room?: string;
  roomName?: string;
  participantIdentity?: string;
  participantName?: string;
}

const logElement = document.querySelector<HTMLPreElement>('#log');
const runButton = document.querySelector<HTMLButtonElement>('#run-test');
const clearButton = document.querySelector<HTMLButtonElement>('#clear-log');
const classIdInput = document.querySelector<HTMLInputElement>('#class-id');
const userNameInput = document.querySelector<HTMLInputElement>('#user-name');
const roleSelect = document.querySelector<HTMLSelectElement>('#role');

if (!logElement || !runButton || !clearButton || !classIdInput || !userNameInput || !roleSelect) {
  throw new Error('Smoke test UI did not initialize correctly.');
}

let activeRun = 0;

function appendLog(message: string, payload?: Record<string, unknown>) {
  const line = payload ? `${message} ${JSON.stringify(payload)}` : message;
  logElement.textContent += `${line}\n`;
  logElement.scrollTop = logElement.scrollHeight;
}

function getRoomName(classId: string) {
  return `learnendo-live-${classId}`;
}

function createIdentity(role: LiveClassRole) {
  return `smoke:${role}:${Date.now()}`;
}

async function requestToken(classId: string, userName: string, role: LiveClassRole) {
  const roomName = getRoomName(classId);
  const participantIdentity = createIdentity(role);

  appendLog('[LiveKitSmoke] token request #1', {
    timestamp: new Date().toISOString(),
    classId,
    role,
    roomName,
    participantIdentity,
  });

  const response = await fetch('/api/getToken', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      room: roomName,
      username: userName,
      participantIdentity,
      metadata: JSON.stringify({ classId, role, smokeTest: true }),
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Token endpoint failed with ${response.status}: ${text}`);
  }

  const payload = JSON.parse(text) as LiveKitTokenResponse;
  const wsUrl = payload.wsUrl ?? payload.url ?? '';

  appendLog('[LiveKitSmoke] token generated #1', {
    timestamp: new Date().toISOString(),
    classId,
    role,
    roomName: payload.roomName ?? payload.room ?? roomName,
    participantIdentity: payload.participantIdentity ?? participantIdentity,
    wsUrlHost: (() => {
      try {
        return new URL(wsUrl).host;
      } catch {
        return wsUrl;
      }
    })(),
  });

  return {
    token: payload.token,
    wsUrl,
    roomName: payload.roomName ?? payload.room ?? roomName,
    participantIdentity: payload.participantIdentity ?? participantIdentity,
  };
}

async function runSmokeTest() {
  if (activeRun > 0) {
    appendLog('[LiveKitSmoke] connect skipped: test already running');
    return;
  }

  const classId = classIdInput.value.trim() || 'smoke-test-class';
  const userName = userNameInput.value.trim() || 'Smoke Test Teacher';
  const role = (roleSelect.value === 'student' ? 'student' : 'teacher') as LiveClassRole;

  activeRun += 1;
  runButton.disabled = true;

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  appendLog('[LiveKitSmoke] Room instance created #1', {
    timestamp: new Date().toISOString(),
    classId,
    role,
    roomState: room.state,
  });

  try {
    const credentials = await requestToken(classId, userName, role);

    appendLog('[LiveKitSmoke] connect attempt #1', {
      timestamp: new Date().toISOString(),
      classId,
      role,
      roomState: room.state,
      wsUrlHost: (() => {
        try {
          return new URL(credentials.wsUrl).host;
        } catch {
          return credentials.wsUrl;
        }
      })(),
    });

    await room.connect(credentials.wsUrl, credentials.token);

    appendLog('[LiveKitSmoke] connect success #1', {
      timestamp: new Date().toISOString(),
      classId,
      role,
      roomState: room.state,
      participantIdentity: credentials.participantIdentity,
      roomName: credentials.roomName,
    });
  } catch (error) {
    appendLog('[LiveKitSmoke] connect failed #1', {
      timestamp: new Date().toISOString(),
      classId,
      role,
      roomState: room.state,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (room.state !== ConnectionState.Disconnected) {
      room.disconnect();
      appendLog('[LiveKitSmoke] disconnected', {
        timestamp: new Date().toISOString(),
      });
    }
    activeRun = 0;
    runButton.disabled = false;
  }
}

runButton.addEventListener('click', () => {
  void runSmokeTest();
});

clearButton.addEventListener('click', () => {
  logElement.textContent = '';
});

appendLog('[LiveKitSmoke] ready', {
  timestamp: new Date().toISOString(),
  note: 'No media, no publishTrack, single room.connect() call.',
});
