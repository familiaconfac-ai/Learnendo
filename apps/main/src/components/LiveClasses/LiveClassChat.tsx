import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { LiveClassMessage } from '../../types';
import { sendLiveClassMessage, subscribeLiveClassMessages } from '../../services/liveClassesService';

interface LiveClassChatProps {
  classId: string;
  user: User;
}

export const LiveClassChat: React.FC<LiveClassChatProps> = ({ classId, user }) => {
  const [messages, setMessages] = useState<LiveClassMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

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
      await sendLiveClassMessage(classId, user.uid, senderName, text);
      setText('');
    } catch (error) {
      console.warn('[LiveClassChat] send message failed:', error);
    } finally {
      setSending(false);
    }
  };

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
                <p>{msg.text}</p>
              </div>
            );
          })
        )}
      </div>

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
    </div>
  );
};
