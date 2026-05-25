# Screen Share Diagnostic Guide
**Last Updated:** 2026-04-11  
**Status:** Automated diagnostics added. Ready for manual testing.

---

## 📋 What Was Analyzed

The screen sharing feature in Live Classes/Workspace allows a teacher to share their screen with students using `setScreenShareEnabled()` from LiveKit.

### Fluxo identificado:

**PROFESSOR (TeacherRoomView.tsx, lines 213-240):**
```
1. Button click → toggleScreenShare()
2. setScreenShareEnabled(true/false)
3. useTracks() captures Track.Source.ScreenShare
4. Renders locally with VideoTrack
```

**ALUNO (StudentRoomView.tsx, lines 119-155):**
```
1. useTracks() captures all Track.Source.ScreenShare from remotes
2. Finds teacherScreenTrack (remote-only)
3. Derives isTeacherSharing = !!teacherScreenTrack && isTrackReference()
4. Conditional render with z-40 overlay
```

---

## 🔴 Problem Statement

**Reported Issue:**  
- Teacher starts sharing screen ✓ (works: teacher sees it)  
- Aluno vê apenas lousa, NÃO vê tela compartilhada ✗ (at least in one test case)  
- Another test worked fine ✓ (same feature, same setup)  

**Questions:**
1. Does the screen share track actually arrive at the student? (NETWORK)
2. Is `isTeacherSharing` correctly detected? (RENDER CONDITION)
3. Is the overlay element rendered but hidden? (CSS/LAYOUT)
4. Does student joining AFTER share started cause unsubscribe? (TIMING)
5. Is this browser/device-specific? (CLIENT)
6. Or is it just a one-time fluke? (CIRCUMSTANTIAL)

---

## 🔍 Diagnostic Logs Added (TEMPORARY)

### PROFESSOR logs:

```javascript
[ScreenShare:Teacher] Track sync: { sharing, trackCount, hasLocalTrack }
[ScreenShare:Teacher] Starting screen share
[ScreenShare:Teacher] Screen share started
[ScreenShare:Teacher] Screen share cancelled or denied: <msg>
[ScreenShare:Teacher] Resyncing state: <actual>
```

### ALUNO logs:

```javascript
[ScreenShare:Student] State check: {
  screenShareTracksCount,
  hasTeacherScreenTrack,
  isTrackRef,
  isTeacherSharing,
  mainStageMode
}

[ScreenShare:Student] RENDER CONDITION TRUE - screen share element should be visible
[ScreenShare:Student] RENDER BLOCKED: track exists but isTeacherSharing is false
[ScreenShare:Student] SCREEN SHARE SUBSCRIBED! { kind, from }
[ScreenShare:Student] RENDERING screen share overlay (z-40)
```

---

## ✅ Manual Test Checklist

### TESTE 1: Basic Screen Share (Both in room before share)
- [ ] Professor entra em Live Class
- [ ] Aluno entra em Live Class
- [ ] **Teacher clica botão de screen share 📺**
- [ ] Verificar **console do professor:**
  - Vê logs `[ScreenShare:Teacher] Starting screen share`?
  - Vê logs `[ScreenShare:Teacher] Track sync: { sharing: true, ...}`?
- [ ] Verificar **console do aluno:**
  - Vê logs `[ScreenShare:Student] State check: { hasTeacherScreenTrack: true, isTeacherSharing: true, ...}`?
  - Vê logs `[ScreenShare:Student] RENDERING screen share overlay`?
- [ ] **Visually:** Aluno vê a tela compartilhada (overlay laranja "📺 Tela do professor" deve aparecer)?
- [ ] **Result:** ✓ PASS / ✗ FAIL + Screenshot + Console logs

---

### TESTE 2: Student Joins AFTER Share Started (Late joiners)
- [ ] Professor entra em Live Class
- [ ] **Teacher clica botão de screen share 📺**
- [ ] **DEPOIS disso, aluno entra**
- [ ] Verificar **console do aluno (immediately after joining):**
  - Vê `[ScreenShare:Student] State check: { hasTeacherScreenTrack: true, ...}`?
- [ ] **Visually:** Aluno vê a tela compartilhada imediatamente?
- [ ] **Result:** ✓ PASS / ✗ FAIL + Screenshot + Console logs

---

### TESTE 3: Share via Window (not tab)
- [ ] Professor entra
- [ ] Aluno entra
- [ ] **Teacher clica screen share, selects "Janela" (window)**
- [ ] Verificar console professor e aluno conforme TESTE 1
- [ ] **Result:** ✓ PASS / ✗ FAIL

---

### TESTE 4: Share via Full Monitor
- [ ] Professor entra
- [ ] Aluno entra
- [ ] **Teacher clica screen share, selects "Monitor inteiro" (entire screen)**
- [ ] Verificar console professor e aluno conforme TESTE 1
- [ ] **Result:** ✓ PASS / ✗ FAIL

---

### TESTE 5: Stop Screen Share (Return to workspace)
- [ ] Após TESTE 1 (screen sharing ativo)
- [ ] **Teacher clica botão screen share novamente para PARAR**
- [ ] Verificar **console do professor:**
  - Vê logs `[ScreenShare:Teacher] Stopping screen share`?
  - Vê logs `[ScreenShare:Teacher] Track sync: { sharing: false, ...}`?
- [ ] Verificar **console do aluno:**
  - Vê logs `[ScreenShare:Student] State check: { isTeacherSharing: false, ...}`?
- [ ] **Visually:** Overlay desaparece, volta à lousa? Camera PIP volta?
- [ ] **Result:** ✓ PASS / ✗ FAIL

---

### TESTE 6: Different Browser on Student (if possible)
- [ ] Setup: Professor em Chrome
- [ ] **Aluno testa em Firefox/Safari/Edge**
- [ ] Execute TESTE 1
- [ ] **Result:** ✓ PASS / ✗ FAIL (+ browser name)

---

### TESTE 7: Network Latency Simulation (if testable)
- [ ] Setup in both rooms with network throttling (DevTools -> Network -> Slow 3G)
- [ ] Execute TESTE 1 + TESTE 2
- [ ] Note delay times between professor start and student render
- [ ] **Result:** ✓ PASS / ✗ FAIL + latency notes

---

## 📊 Interpreting Results

### All Tests PASS ✓
- **Conclusion:** Feature works reliably. Previous issue was **CIRCUMSTANTIAL** (browser cache, permissions, one-time network glitch, etc.)
- **Action:** Remove diagnostic logs, close issue
- **Monitoring:** Keep console logs in production briefly to catch edge cases

### TESTE 1 or 2 FAIL (screen not visible)
- **Check logs first:**
  - Does `[ScreenShare:Student] State check` show `hasTeacherScreenTrack: true`?
  - If FALSE → Track never arrived (network/subscription issue)
  - If TRUE → Render condition is being evaluated
  - Does `[ScreenShare:Student] RENDERING screen share overlay` appear?
- **If logs show RENDERING but student doesn't see:**
  - Likely CSS/z-index issue or overlay hidden by workspace mode
  - Needs investigation of `mainStageMode` logic
- **If logs show BLOCKED or no track:**
  - Subscription issue → investigate LiveKit config

### TESTE 3, 4, or 5 FAIL
- **Indicates:** Problem is specific to window/monitor selection or stop logic
- **Action:** Check if `source` property is correctly passed to `setScreenShareEnabled()`

### TESTE 6 FAIL (only one browser fails)
- **Conclusion:** Browser-specific issue (permissions, autoplay, codec support)
- **Action:** Investigate browser DevTools for Media element errors

---

## 🛠️ Debugging Commands (Browser Console)

```javascript
// View all remote participants and their tracks
room.remoteParticipants.forEach(p => {
  console.log(`Participant ${p.identity}:`,
    Array.from(p.trackPublications.values()).map(pub => ({
      kind: pub.track?.kind,
      source: pub.source,
      muted: pub.isMuted,
      subscribed: pub.isSubscribed
    }))
  );
});

// Check if screen share track is being received
const screenTracks = Array.from(room.remoteParticipants.values())
  .flatMap(p => Array.from(p.trackPublications.values()))
  .filter(pub => pub.source === 'screen_share');
console.log('Remote screen share tracks:', screenTracks);

// Check mainStageMode at this moment
console.log('Current mainStageMode:', ??? ); // available in StudentRoomView context
```

---

## 📝 Next Steps After Diagnosis

### If Issue Reproduced (real bug found):
1. Remove diagnostic logs
2. Implement ONE focused fix:
   - Option A: Auto-switch to screen share "mode" when `isTeacherSharing` becomes true
   - Option B: Ensure track subscription even if student joins late
3. Test all 7 tests again
4. Commit fix + remove logs

### If Issue NOT Reproduced (circumstantial):
1. Document in issue/ticket
2. Suggest student check:
   - Browser permissions for screen capture
   - Network connectivity
   - Browser cache (Ctrl+Shift+Delete)
   - Update to latest browser
3. Keep diagnostic logs for 1-2 weeks to catch rare cases
4. Remove logs after verification period

---

## 🔧 Code Locations for Future Fixes

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Screen Share Toggle | TeacherRoomView.tsx | 240–259 | Initiate share |
| Track Detection (Teacher) | TeacherRoomView.tsx | 213–220 | Receive teacher's own track |
| Track Detection (Student) | StudentRoomView.tsx | 119, 135–138 | Detect remote screen share |
| Render Logic | StudentRoomView.tsx | ~392–401 | DisplayVideoTrack with z-40 |
| Mode Control | liveClassStage.ts | 1–27 | MainStageMode enum (currently camera/workspace) |

---

## 📌 Key Findings (Summary)

**NO STRUCTURAL BUG FOUND YET** — Only diagnostic logs added.

### Potential Issues (not yet confirmed):
1. **No automatic mode switch:** Screen share renders at z-40 but may not be visually prominent if student is in 'workspace' mode
2. **Late joiner:** If student joins after teacher begins sharing, subscription may not happen automatically
3. **UI Confusion:** `mainStageMode` doesn't have 'screenShare' option; overlay is always z-40 above current mode

### Recommendation:
- Run all 7 tests
- If all PASS → Issue was circumstantial
- If any FAIL → Implement minimal fix (probably auto-switch mode on screen share + explicit subscription handling for late joiners)

---

**Generated:** April 11, 2026  
**Diagnostic Logs:** Temporary (to be removed after verification)  
**Impact:** Read-only analysis; no production change yet
