# Screen Share — Technical Hypotheses & Proposed Fixes

**Analysis Date:** April 11, 2026  
**Status:** Diagnostic phase (logs added, testing required)

---

## 🔎 Hypotheses Ranked by Probability

### H1: User Joins AFTER Screen Share Started (MEDIUM PROBABILITY)

**Scenario:**
```
t=0:00  Teacher enters room
t=0:05  Student enters room
t=0:10  Teacher starts screen share
t=0:15  Student joins AFTER the subscribe event
```

**Why it might fail:**
- LiveKit initially publishes teacher's camera to everyone
- Teacher then calls `setScreenShareEnabled(true)` → new track published
- But students who joined AFTER receive the NEW track in their room state
- However, useTracks() subscribes automatically to all new Track.Source.ScreenShare
- **BUT:** There might be a race condition if the track arrives before the student's room state snapshot is processed

**Diagnostic:**
- TESTE 2 will reveal this
- Look for: Does console show `hasTeacherScreenTrack: true` immediately after joining?

**Proposed Minimal Fix (if confirmed):**
```typescript
// In StudentRoomView.tsx after room initialization
useEffect(() => {
  // Force subscription to any existing screen share tracks
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.trackPublications.values()) {
      if (pub.source === Track.Source.ScreenShare && !pub.isSubscribed) {
        console.log('[ScreenShare:Student] Forcing subscription to existing track');
        pub.setSubscribed(true).catch(err => 
          console.warn('[ScreenShare:Student] subscription failed:', err)
        );
      }
    }
  }
}, [room.remoteParticipants]);
```

---

### H2: No Automatic Mode Switch (LOW PROBABILITY, BUT POSSIBLE)

**Scenario:**
```
Student is viewing mainStageMode='workspace'
Teacher starts screen share
Screen share renders at z-40 above workspace (z-20)
But workspace is 'opacity-100' and has pointer-events-auto
Student sees workspace not screen share
```

**Why it might fail:**
- The overlay div has `absolute inset-0 z-40` which SHOULD overlay everything
- But CSS stacking context issues could prevent z-40 from working correctly
- Or mainStageMode switching could block it somehow

**Diagnostic:**
- TESTE 1 will reveal this if screen share div is created but not visible
- Look for: Does console show `[ScreenShare:Student] RENDERING screen share overlay`?
- If YES: Problem is CSS/visibility; if NO: Problem is track not arriving

**Proposed Minimal Fix (if confirmed):**
```typescript
// Add automatic mode switch when screen share starts
useEffect(() => {
  if (isTeacherSharing) {
    // Optionally switch to "dedicated" view for screen share
    console.log('[ScreenShare:Student] Auto-switching to screen share view');
    // Or ensure overlay is visible by adding explicit CSS class
    // Could add to the div: className={`... ${isTeacherSharing ? 'force-overlay-visible' : ''}`}
  }
}, [isTeacherSharing]);
```

---

### H3: Browser Autoplay / Media Element Error (MEDIUM PROBABILITY)

**Scenario:**
```
Track arrives, VideoTrack component tries to attach
Browser blocks playback due to autoplay restrictions
Student never sees the element
```

**Why it might fail:**
- Modern browsers require user interaction for autoplay
- Some browsers are stricter than others
- If audio is enabled in the screen share stream, autoplay is blocked more aggressively

**Diagnostic:**
- TESTE 6 (different browser) will reveal if browser-specific
- Look in **browser DevTools → Console** for errors like:
  - "NotAllowedError: play() was rejected because the user denied permission"
  - "Media element error"

**Proposed Minimal Fix (if confirmed):**
```typescript
// VideoTrack from LiveKit might need explicit play() permission
// Within StudentRoomView render where screen share is shown:
{isTeacherSharing && teacherScreenTrack && (
  <div ... onCanPlay={() => {
    // Force play if not already playing
    const el = screenShareRef.current;
    if (el && !el.playing) {
      el.play().catch(e => 
        console.warn('[ScreenShare:Student] play() failed:', e)
      );
    }
  }}>
    <VideoTrack trackRef={teacherScreenTrack} />
  </div>
)}
```

---

### H4: Track Muting or Ended State (LOW PROBABILITY)

**Scenario:**
```
Track arrives but is muted (enabled=false) or ended
VideoTrack component can't render a non-working stream
Student sees broken overlay or blank video
```

**Diagnostic:**
- Check console logs or DevTools MediaElements
- Look for: `track.enabled === false` or `track.readyState === 'ended'`

**Proposed Minimal Fix:**
```typescript
// Validate track state before rendering
const isTrackValid = teacherScreenTrack && 
  (teacherScreenTrack as any).track?.enabled && 
  (teacherScreenTrack as any).track?.readyState === 'live';

{isTeacherSharing && isTrackValid && (
  <div ...>
    <VideoTrack trackRef={teacherScreenTrack} />
  </div>
)}
```

---

### H5: One-Time Browser/Network Glitch (HIGH PROBABILITY)

**Scenario:**
```
Any transient condition:
- Browser cache stale
- Network packet loss during subscribe
- LiveKit server brief latency
- Student's app in background (suspending streams)
```

**Why it might fail:**
- Complex distributed system (browser → LiveKit signaling → WebRTC → peer)
- Any single point of failure manifests as "not seeing screen"
- Usually resolves on retry or page refresh

**Diagnostic:**
- If TESTE 2-7 all PASS → This hypothesis is confirmed
- The reported issue was likely a one-time transient condition

**Proposed Minimal Fix:**
- No code fix needed
- Add: Observer instructions to retry or refresh browser
- Add: Production telemetry to catch similar events

---

## 🎯 Recommended Fix Stack (if ANY test fails)

### For H1 (Late Joiner):
**Priority: MEDIUM** | **Effort: LOW** | **Risk: VERY LOW**

Add the force-subscription code above. Safe because it only subscribes to already-available tracks.

### For H2 (No Mode Switch):
**Priority: LOW** | **Effort: MEDIUM** | **Risk: LOW**

Add explicit mode-switch logic OR improve CSS stacking. This is a UX improvement, not critical.

### For H3 (Autoplay):
**Priority: MEDIUM** | **Effort: LOW** | **Risk: LOW**

Ensure room.startAudio() is called before screen share video playback. Already called in StudentRoomView but might need ordering fix.

### For H4 (Track State):
**Priority: LOW** | **Effort: LOW** | **Risk: VERY LOW**

Add validation guards. Safe defensive programming.

### For H5 (Transient):
**Priority: NONE** | **Effort: ZERO** | **Risk: ZERO**

If this is the answer, keep logs for a week to catch edge cases, then remove.

---

## 🚫 What NOT to Do

❌ Rewrite the entire LiveKit integration  
❌ Switch to different WebRTC provider  
❌ Completely refactor mainStageMode system  
❌ Add complex state machines  
❌ Change workspace synchronization  

✅ **DO:** Add minimal guards + subscription fix + diagnostic telemetry  

---

## 📋 Implementation Checklist (when fix needed)

### Phase 1: Validation (CURRENT)
- [x] Add diagnostic logs to Teacher and Student components
- [x] Create 7-test manual checklist
- [ ] **← YOU ARE HERE** → Run tests and collect console logs
- [ ] Analyze results

### Phase 2: If Fix Needed
- [ ] Identify which hypothesis matches results
- [ ] Implement minimal fix from suggested code above
- [ ] Verify fix doesn't break other features (camera, workspace, battle)
- [ ] Remove diagnostic logs
- [ ] Commit with clear message: "Fix: Screen share [specific issue] (#XYZ)"

### Phase 3: Monitoring
- [ ] Keep issue open for 1 week with logs enabled
- [ ] Monitor error telemetry
- [ ] Close once no reports of recurrence

---

## 📊 Risk Assessment of Each Fix

| Fix | Breaking Changes | Performance | Complexity | Rollback |
|-----|------------------|-------------|-----------|----------|
| H1 (force subscribe) | None | Neutral | Low | Trivial |
| H2 (auto mode switch) | None | Neutral | Medium | Easy |
| H3 (autoplay handling) | None | Neutral | Low | Trivial |
| H4 (track validation) | None | Minimal | Low | Trivial |

**Overall Risk:** VERY LOW  
**Recommendation:** Implement all relevant fixes once identified

---

## 🧪 Test Coverage After Fix

Once a fix is implemented, re-run all 7 tests:
- TESTE 1: Screen share basic ← KEY TEST
- TESTE 2: Late joiner ← KEY TEST (if H1 was issue)
- TESTE 3-5: Variations + stop
- TESTE 6: Browser compatibility
- TESTE 7: Network latency

**All must PASS and console must show clean logs**

---

**Next Step:** Run the 7-point checklist with the diagnostic logs now in place!
