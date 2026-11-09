# Implementation Plan: Unified Single Communication Room for Live Meetings

## Overview
This document outlines the architecture and execution plan to establish a single, universal, server-authoritative persistent communication room for live video meets, real-time chat, collaborative documents, and action items that synchronizes seamlessly across all user devices and browsers.

---

## Architecture & Components

### 1. Server-Authoritative Signaling & WebSocket Core (`server/services/meetSocketService.ts`)
- **Central Room Hub**: Maintains active meeting state per organization/workspace in memory and persists session logs in Supabase.
- **Signaling Protocol**: Relays WebRTC SDP offers, answers, and ICE candidates between peers (`JOIN_ROOM`, `OFFER`, `ANSWER`, `ICECANDIDATE`, `MUTE_TOGGLE`, `VIDEO_TOGGLE`, `HAND_RAISE`, `CHAT_MESSAGE`, `SHARE_DOC`, `REQUEST_ADMISSION`, `ADMIT_PEER`, `DECLINE_PEER`, `KICK_PEER`).

### 2. Database Persistence & Cross-Device Sync (`db.sql` & `update.sql`)
- **`meeting_sessions`**: Stores active and historical meeting metadata (title, channel, duration, host, timestamp).
- **`meeting_participants`**: Persists participant records and join timestamps for automatic drop recovery and cross-device session history.
- **`meeting_chat_messages` & `meeting_notes`**: Real-time persisted chat logs and collaborative meeting minutes/action items.

### 3. Client Video & Media Management (`src/pages/MeetRoomPage.tsx` & `ChatVideoMeetModal.tsx`)
- **Hardware Permission Flow**: Automatic hardware detection (`navigator.mediaDevices.enumerateDevices` & `getUserMedia`) with fallback error boundaries and manual "Test Hardware" triggers.
- **Waiting Room & Admission Control**: Non-host participants enter a waiting room queue requiring host admission (`ADMIT_PEER` / `DECLINE_PEER`).
- **Participant Moderation**: Hosts can view the active participant list, remove disruptive participants, or invite organization members to join instantly.
- **Session Auto-Rejoin**: Queries Supabase `meeting_participants` on load to automatically reconnect users to dropped sessions within a 15-minute window without re-prompting for hardware permissions.

---

## Step-by-Step Implementation Roadmap

1. **Phase 1: Signaling & WebSocket Relay Stabilization**
   - Ensure WebSocket upgrade handler (`/ws/meet`) handles multi-peer mesh connections reliably across mobile and desktop browsers.
   - Implement heartbeat pings to prevent idle timeout disconnects.

2. **Phase 2: Persistent Supabase Database Schema Sync**
   - Execute migrations for `meeting_sessions`, `meeting_participants`, `meeting_documents`, and `meeting_notes` with real-time replication enabled (`supabase_realtime`).

3. **Phase 3: Unified Room UI & Moderation Controls**
   - Enhance `ChatVideoMeetModal.tsx` with unified video grid, screen sharing, real-time chat, live document collaboration, and participant management (Admit, Remove, Invite).

4. **Phase 4: Cross-Device Verification**
   - Test simultaneous multi-device connection (Desktop + Smartphone) to verify synchronized video/audio streaming, chat relay, and checklist-driven task updates.
