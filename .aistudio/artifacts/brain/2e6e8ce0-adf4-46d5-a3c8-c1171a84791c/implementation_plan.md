# Implementation Plan - Impacto Office Suite & Live Meet Enhancements

## User Requirements
1. **Document Editor (Word)**:
   - Remove hardcoded default header/footer elements from the document canvas and move them into sidebar toggles:
     - `Include Branded Letterhead & Title`
     - `Include Reference & Date Bar`
     - `Include Verified Digital Author & Signatory Footer`
     - `Include Security & Timestamped Footer`
   - Implement **Multi-Page Support**: allow users to add new pages, navigate between pages, and draft across multiple document pages.
2. **Spreadsheet Editor (Excel)**:
   - Remove all static dummy data and default action columns so the spreadsheet starts completely empty.
   - Provide a grid dimension picker / resizer (number of rows and columns) upon creation or via header controls.
   - Implement **Multi-Sheet Support**: allow users to create, rename, switch between, and delete multiple spreadsheet sheets (Sheet 1, Sheet 2, etc.) with sheet tabs.
3. **Live Video Meet & Audio/Video Synchronization**:
   - Fix room synchronization so all organization members joining a meeting on the same channel automatically join the exact same hosted meeting room (`impacto_meet_room_${activeOrg?.id}_${channelName}`).
   - Ensure reliable WebRTC audio and video communication tracks, status indicators, and permission handling.
4. **Zero Emojis & Strict Adherence**:
   - Strictly prohibit any emojis across all code, UI text, labels, and summaries.

---

## Proposed Changes

### 1. Document Office (`src/components/DocumentOffice.tsx`)
- **Word Sidebar Toggles**:
  - Add sidebar checkboxes for `showRefBar` (Reference & Date bar) and `showSignatoryFooter` (Digital Author & Signatory footer) alongside `showBrandedHeader`.
  - Conditionally render these blocks in the Word editor canvas based on the sidebar toggles.
- **Word Multi-Page Pagination**:
  - Maintain `wordPages: string[]` state (array of page content strings).
  - Add page navigation controls (`Page X of Y`, `Add Page`, `Delete Page`).
- **Excel Empty Grid & Multi-Sheet**:
  - Initialize `gridData` as entirely empty strings (e.g. 15 rows by 8 columns of `""`).
  - Add a grid dimension modal/prompt (ask user for number of rows and columns, default 15x8).
  - Add multi-sheet support via `sheets: Array<{ id: string; name: string; data: string[][] }>` state, with sheet tabs at the bottom and a `+ Add Sheet` button.

### 2. Video Meet Synchronization (`src/components/ChatVideoMeetModal.tsx` & `src/pages/dashboard.tsx`)
- Standardize the `BroadcastChannel` room name to use `impacto_meet_room_${activeOrg?.id}_${channelName}` so all members joining the same channel connect to the exact same active meeting.
- Ensure microphone and camera media tracks are cleanly acquired, broadcasted, and rendered in WebRTC peer connections.

---

## Verification Plan
- Compile with `compile_applet`.
- Lint with `lint_applet`.
- Verify zero emojis and robust functionality.
