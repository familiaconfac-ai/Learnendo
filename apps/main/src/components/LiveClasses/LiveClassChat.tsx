import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClassMessage, LiveClassRole } from '../../types';
import {
  sendLiveClassAudioMessage,
  sendLiveClassMessage,
  subscribeLiveClassMessages,
} from '../../services/liveClassesService';

interface LiveClassChatProps {
  classId: string;
  user: User;
  role?: LiveClassRole;
  allowAudio?: boolean;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to encode audio note'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

function formatSeconds(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const LiveClassChat: React.FC<LiveClassChatProps> = ({
  classId,
  user,
  role = 'student' as LiveClassRole,
  allowAudio = false,
}) => {
  const chatRole = role;
  const [messages, setMessages] = useState<LiveClassMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [audioError, setAudioError] = useState('');

  const senderName = useMemo(
    () => user.displayName || user.email || 'Student',
    [user.displayName, user.email],
  );

  useEffect(() => {
    const unsubscribe = subscribeLiveClassMessages(classId, setMessages, (error) => {
      console.warn('[LiveClassChat] message subscription failed:', error);
    });
    return unsubscribe;
  }, [classId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendLiveClassMessage(classId, user.uid, senderName, text, chatRole);
      setText('');
    } catch (error) {
      console.warn('[LiveClassChat] send message failed:', error);
    } finally {
      setSending(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!allowAudio) return;

    if (!recording) {
      try {
        setAudioError('');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        setRecordedChunks([]);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setRecordedChunks((prev) => [...prev, event.data]);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setRecorder(mediaRecorder);
        setRecordingStartedAt(Date.now());
        setRecording(true);
      } catch (error) {
        console.warn('[LiveClassChat] audio recording start failed:', error);
        setAudioError('Microphone permission is required to send audio notes.');
      }
      return;
    }

    if (!recorder) return;
    recorder.stop();
    setRecording(false);
    setRecorder(null);
  };

  useEffect(() => {
    if (recording || recordedChunks.length === 0 || sending) return;

    const uploadAudio = async () => {
      setSending(true);
      try {
        const blob = new Blob(recordedChunks, { type: recorder?.mimeType || 'audio/webm' });
        const audioDataUrl = await blobToDataUrl(blob);
        const elapsedSec = recordingStartedAt
          ? Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000))
          : undefined;
        await sendLiveClassAudioMessage(
          classId,
          user.uid,
          senderName,
          audioDataUrl,
          blob.type || 'audio/webm',
          elapsedSec,
          chatRole,
        );
      } catch (error) {
        console.warn('[LiveClassChat] send audio note failed:', error);
        setAudioError('Could not send audio note. Please try again.');
      } finally {
        setRecordedChunks([]);
        setRecordingStartedAt(null);
        setSending(false);
      }
    };

    void uploadAudio();
  }, [chatRole, classId, recordedChunks, recording, recorder?.mimeType, recordingStartedAt, senderName, sending, user.uid]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-3">
      <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-blue-300">Class Chat</h3>

      <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-900 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderUid === user.uid;
            return (
              <div
                key={msg.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  mine ? 'ml-auto bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'
                }`}
              >
                <p className="text-[11px] font-semibold opacity-80">{msg.senderName}</p>
                {msg.type === 'audio' && msg.audioDataUrl ? (
                  <div className="mt-1 space-y-1">
                    <audio controls src={msg.audioDataUrl} className="w-full" preload="none" />
                    {msg.audioDurationSec ? (
                      <p className="text-[10px] font-semibold opacity-80">Audio note {formatSeconds(msg.audioDurationSec)}</p>
                    ) : null}
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {audioError ? <p className="mb-2 text-xs font-semibold text-rose-300">{audioError}</p> : null}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleSend();
            }
          }}
          className="flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          placeholder="Type a message"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !text.trim()}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#059669] disabled:opacity-60"
        >
          Send
        </button>
        {allowAudio ? (
          <button
            type="button"
            onClick={() => void handleToggleRecording()}
            disabled={sending}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              recording
                ? 'bg-rose-500 text-white shadow-[0_3px_0_0_#be123c]'
                : 'bg-amber-400 text-slate-900 shadow-[0_3px_0_0_#d97706]'
            } disabled:opacity-60`}
          >
            {recording ? 'Stop' : 'Audio'}
          </button>
        ) : null}
      </div>
    </div>
  );
};
