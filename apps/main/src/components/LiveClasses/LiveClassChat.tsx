import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { createPortal } from 'react-dom';
import { LiveClassMessage, LiveClassRole } from '../../types';
import {
  AUDIO_NOTE_EXPIRATION_MS,
  deleteLiveClassMessage,
  purgeExpiredLiveClassAudioNotes,
  setLiveClassAudioMessagePinned,
  sendLiveClassAudioMessage,
  sendLiveClassMessage,
  subscribeLiveClassMessages,
} from '../../services/liveClassesService';

interface LiveClassChatProps {
  classId: string;
  user: User;
  role?: LiveClassRole;
  allowAudioNotes?: boolean;
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
  allowAudioNotes = false,
}) => {
  const chatRole = role;
  const [messages, setMessages] = useState<LiveClassMessage[]>([]);
  const [actionInProgressForMessageId, setActionInProgressForMessageId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<{
    messageId: string;
    top: number;
    left: number;
  } | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioNoteBlob, setAudioNoteBlob] = useState<Blob | null>(null);
  const [audioNoteDurationSec, setAudioNoteDurationSec] = useState<number | undefined>(undefined);
  const [audioNotePreviewUrl, setAudioNotePreviewUrl] = useState<string>('');
  const [audioMimeType, setAudioMimeType] = useState('audio/webm');
  const [audioError, setAudioError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const runPurge = () => {
      void purgeExpiredLiveClassAudioNotes(classId).catch((error) => {
        console.warn('[LiveClassChat] audio note purge failed:', error);
      });
    };

    runPurge();
    const timer = window.setInterval(runPurge, 60000);
    return () => window.clearInterval(timer);
  }, [classId]);

  useEffect(() => {
    return () => {
      if (audioNotePreviewUrl) {
        URL.revokeObjectURL(audioNotePreviewUrl);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioNotePreviewUrl]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (chatRef.current?.contains(target) || actionMenuRef.current?.contains(target)) {
        return;
      }
      if (!chatRef.current) return;
      if (!chatRef.current.contains(target)) {
        setActionMenu(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActionMenu(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

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
    if (!allowAudioNotes) return;

    if (!recording) {
      try {
        setAudioError('');
        if (audioNotePreviewUrl) {
          URL.revokeObjectURL(audioNotePreviewUrl);
        }
        setAudioNotePreviewUrl('');
        setAudioNoteBlob(null);
        setAudioNoteDurationSec(undefined);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        const startedAt = Date.now();
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        setAudioMimeType(mimeType);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const previewUrl = URL.createObjectURL(blob);
          setAudioNoteBlob(blob);
          setAudioNotePreviewUrl(previewUrl);
          setAudioNoteDurationSec(
            Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          );
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        };

        mediaRecorder.start();
        setRecorder(mediaRecorder);
        setRecordingStartedAt(startedAt);
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

  const handleDiscardAudioNote = () => {
    if (audioNotePreviewUrl) {
      URL.revokeObjectURL(audioNotePreviewUrl);
    }
    setAudioNotePreviewUrl('');
    setAudioNoteBlob(null);
    setAudioNoteDurationSec(undefined);
    setRecordingStartedAt(null);
    setAudioError('');
  };

  const handleSendAudioNote = async () => {
    if (!audioNoteBlob || sending || recording) return;
    setSending(true);
    try {
      const audioDataUrl = await blobToDataUrl(audioNoteBlob);
      await sendLiveClassAudioMessage(
        classId,
        user.uid,
        senderName,
        audioDataUrl,
        audioMimeType,
        audioNoteDurationSec,
        chatRole,
      );
      handleDiscardAudioNote();
    } catch (error) {
      console.warn('[LiveClassChat] send audio note failed:', error);
      setAudioError('Could not send audio note. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const isAudioMessage = (msg: LiveClassMessage): boolean => msg.type === 'audio' || !!msg.audioDataUrl;

  const canManageAudioNote = (msg: LiveClassMessage): boolean => {
    if (!isAudioMessage(msg)) return false;
    return chatRole === 'teacher' || msg.senderUid === user.uid;
  };

  const isAudioNoteExpired = (msg: LiveClassMessage): boolean => {
    if (!isAudioMessage(msg) || msg.isPinned) return false;
    const now = Date.now();
    if (typeof msg.expiresAtMs === 'number') {
      return msg.expiresAtMs <= now;
    }

    const createdAtMs = msg.createdAt ? Date.parse(msg.createdAt) : Number.NaN;
    if (Number.isFinite(createdAtMs)) {
      return createdAtMs + AUDIO_NOTE_EXPIRATION_MS <= now;
    }
    return false;
  };

  const visibleMessages = useMemo(
    () => messages.filter((msg) => !isAudioNoteExpired(msg)),
    [messages],
  );

  const handleDeleteAudioNote = async (msg: LiveClassMessage) => {
    if (!canManageAudioNote(msg) || actionInProgressForMessageId) return;
    setActionInProgressForMessageId(msg.id);
    try {
      await deleteLiveClassMessage(classId, msg.id);
      setActionMenu(null);
    } catch (error) {
      console.warn('[LiveClassChat] delete audio note failed:', error);
    } finally {
      setActionInProgressForMessageId(null);
    }
  };

  const handleTogglePinAudioNote = async (msg: LiveClassMessage) => {
    if (!canManageAudioNote(msg) || actionInProgressForMessageId) return;
    setActionInProgressForMessageId(msg.id);
    try {
      await setLiveClassAudioMessagePinned(
        classId,
        msg.id,
        !msg.isPinned,
        user.uid,
        senderName,
      );
      setActionMenu(null);
    } catch (error) {
      console.warn('[LiveClassChat] pin audio note failed:', error);
    } finally {
      setActionInProgressForMessageId(null);
    }
  };

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLButtonElement>, messageId: string) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setActionMenu((current) => {
      if (current?.messageId === messageId) {
        return null;
      }

      return {
        messageId,
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - 148),
      };
    });
  };

  return (
    <div ref={chatRef} className="rounded-2xl border border-slate-700 bg-slate-800 p-3">
      <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-blue-300">Class Chat</h3>

      <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-900 p-3">
        {visibleMessages.length === 0 ? (
          <p className="text-xs text-slate-400">No messages yet. Start the conversation.</p>
        ) : (
          visibleMessages.map((msg) => {
            const mine = msg.senderUid === user.uid;
            const canManage = canManageAudioNote(msg);
            const isBusy = actionInProgressForMessageId === msg.id;
            return (
              <div
                key={msg.id}
                className={`relative max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  mine ? 'ml-auto bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'
                }`}
              >
                {isAudioMessage(msg) && canManage ? (
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold opacity-80">
                      {msg.senderName}
                      {msg.isPinned ? '  [Pinned]' : ''}
                    </p>
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-black/30"
                      onClick={(event) => handleOpenActionMenu(event, msg.id)}
                      disabled={isBusy}
                      aria-label="Open note actions"
                    >
                      Actions
                    </button>
                  </div>
                ) : null}

                {!isAudioMessage(msg) ? <p className="text-[11px] font-semibold opacity-80">{msg.senderName}</p> : null}
                {isAudioMessage(msg) && msg.audioDataUrl ? (
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

      {actionMenu ? createPortal(
        <div
          ref={actionMenuRef}
          className="fixed z-[1200] w-36 rounded-lg border border-slate-600 bg-slate-900 p-1 shadow-2xl"
          style={{ top: actionMenu.top, left: actionMenu.left }}
        >
          {(() => {
            const targetMessage = visibleMessages.find((msg) => msg.id === actionMenu.messageId);
            if (!targetMessage || !canManageAudioNote(targetMessage)) {
              return null;
            }

            const isBusy = actionInProgressForMessageId === targetMessage.id;

            return (
              <>
                <button
                  type="button"
                  className="block w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-slate-100 hover:bg-slate-800"
                  onClick={() => void handleTogglePinAudioNote(targetMessage)}
                  disabled={isBusy}
                >
                  {targetMessage.isPinned ? 'Unpin note' : 'Pin note'}
                </button>
                <button
                  type="button"
                  className="mt-1 block w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-rose-300 hover:bg-slate-800"
                  onClick={() => void handleDeleteAudioNote(targetMessage)}
                  disabled={isBusy}
                >
                  Delete note
                </button>
              </>
            );
          })()}
        </div>,
        document.body,
      ) : null}

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
      </div>

      {allowAudioNotes ? (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-slate-900/70 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wide text-amber-300">Audio Note / Record Response</h4>
              <p className="text-xs text-slate-400">
                Secondary tool for oral responses and review. Separate from the Live Mic.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-slate-500">
              {recording ? 'Recording in progress' : audioNoteBlob ? 'Ready to send' : 'No note recorded'}
            </div>
          </div>

          {audioNotePreviewUrl ? (
            <div className="mt-3 rounded-xl bg-slate-950 p-3">
              <audio controls src={audioNotePreviewUrl} className="w-full" preload="none" />
              {audioNoteDurationSec ? (
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Audio note {formatSeconds(audioNoteDurationSec)}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
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
              {recording ? 'Stop Recording' : 'Start Audio Note'}
            </button>

            <button
              type="button"
              onClick={() => void handleSendAudioNote()}
              disabled={!audioNoteBlob || sending || recording}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#059669] disabled:opacity-60"
            >
              Send Audio Note
            </button>

            <button
              type="button"
              onClick={handleDiscardAudioNote}
              disabled={!audioNoteBlob || sending || recording}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 disabled:opacity-60"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
