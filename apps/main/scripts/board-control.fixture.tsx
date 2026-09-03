import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browserSessionPersistence, setPersistence, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, disableNetwork, enableNetwork } from 'firebase/firestore';
import { auth, db } from '../src/services/firebase';
import { WorkspaceCanvas } from '../src/components/LiveClasses/Workspace/WorkspaceCanvas';
import { UiLanguageProvider } from '../src/i18n/UiLanguageContext';
const role = new URLSearchParams(location.search).get('role') ?? 'teacher';
const classId = 'browser-board';
function Fixture() {
  const [uid, setUid] = useState(''); const [classData, setClassData] = useState<any>(null);
  const [visualUpdates, setVisualUpdates] = useState(0);
  const [control, setControl] = useState<any>(null); const [updates, setUpdates] = useState(0);
  useEffect(() => { void (async () => {
    await setPersistence(auth, browserSessionPersistence);
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    await fetch('/seed', { method: 'POST', body: JSON.stringify({ uid: user.uid, role }) }); setUid(user.uid);
  })(); }, []);
  useEffect(() => {
    if (!uid) return;
    const a = onSnapshot(doc(db, 'liveClasses', classId), s => setClassData(s.data()));
    const b = onSnapshot(doc(db, 'liveClasses', classId, 'shared', 'boardControl'), s => { if (!s.metadata.hasPendingWrites) { setControl(s.data()); setUpdates(n => n + 1); } });
    const c = onSnapshot(doc(db, 'liveClasses', classId, 'shared', 'boardView'), s => { if (!s.metadata.hasPendingWrites) setVisualUpdates(n => n + 1); });
    return () => { a(); b(); c(); };
  }, [uid]);
  const selectGap = (reset = false) => {
    const editor = document.querySelector<HTMLElement>('[data-board-document]')!;
    editor.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: editor.getBoundingClientRect().x + 50, clientY: editor.getBoundingClientRect().y + 30 }));
    let attempts = 0;
    const apply = () => {
      if (++attempts > 80) return;
      if (!editor.isContentEditable) { setTimeout(apply, 50); return; }
      editor.focus({ preventScroll: true }); const paragraph = editor.querySelector('p')!;
      if (reset) { paragraph.textContent = 'Ub ----- bl'; editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); }
      const point = (offset: number) => {
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT); let node = walker.nextNode()!;
        while (offset > node.textContent!.length && walker.nextNode()) { offset -= node.textContent!.length; node = walker.currentNode; }
        return { node, offset };
      };
      const start = point(3); const end = point(paragraph.textContent!.length - 3);
      const range = document.createRange(); range.setStart(start.node, start.offset); range.setEnd(end.node, end.offset);
      const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
      editor.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    }; apply();
  };
  return <UiLanguageProvider value={{ uiLanguage: 'pt', baseLanguage: 'pt' }}>
    <header style={{ background: 'white', height: 84 }}>
      <strong>Fixture {role}</strong> <button onClick={() => selectGap()}>Select gap</button><button onClick={() => selectGap(true)}>Reset gap</button>
      <button onClick={() => { const el = document.querySelector<HTMLElement>('[data-directed-board] .overflow-x-hidden')!; el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 })); el.scrollTop = el.scrollHeight; }}>Bottom</button>
      <button onClick={() => { const el = document.querySelector<HTMLElement>('[data-directed-board] .overflow-x-hidden')!; el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 })); el.scrollTop = 0; }}>Top</button>
      <button onClick={() => { const el = document.querySelector('[data-directed-board]')!; for (let i = 0; i < 20; i++) el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 0, clientX: i })); }}>Mouse move</button><button onClick={() => disableNetwork(db)}>Offline</button><button onClick={() => enableNetwork(db)}>Online</button>
      <button onClick={() => { const el = document.querySelector<HTMLElement>('[data-board-document]')!; if (!el.isContentEditable) return; el.focus(); el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); document.execCommand('insertText', false, '漢'); }}>IME start</button>
      <button onClick={() => { const el = document.querySelector<HTMLElement>('[data-board-document]')!; el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '漢' })); }}>IME end</button>
      <p>Visual: {visualUpdates} · Updates: {updates} · Epoch: {control?.epoch} · Writer: {classData?.labels?.[control?.controllerId] ?? 'none'} · Designated: {classData?.labels?.[control?.designatedStudentId] ?? 'none'}</p>
    </header>
    {uid && classData && <div style={{ height: role === 'teacher' ? 620 : 480, width: role === 'teacher' ? '100%' : 390 }}>
      <WorkspaceCanvas classId={classId} userId={uid} userName={role} isTeacher={role === 'teacher'} classTeacherUserId={classData.teacherUid}
        assignedRoster={classData.assignedStudentIds.map((id: string) => ({ uid: id, label: classData.labels[id], isOnline: true }))} />
    </div>}
  </UiLanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
