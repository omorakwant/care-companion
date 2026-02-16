# CareFlow — Hospital Care Companion

## Comprehensive Project Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem: Shift Handover Communication Failures](#2-the-problem-shift-handover-communication-failures)
3. [How CareFlow Solves It](#3-how-careflow-solves-it)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Core Features](#6-core-features)
7. [AI Pipeline](#7-ai-pipeline)
8. [Database Schema](#8-database-schema)
9. [User Roles & Access Control](#9-user-roles--access-control)
10. [Application Pages](#10-application-pages)
11. [Edge Functions (Backend)](#11-edge-functions-backend)
12. [Internationalization](#12-internationalization)
13. [Real-Time Features](#13-real-time-features)
14. [Deployment](#14-deployment)
15. [Project Structure](#15-project-structure)
16. [Getting Started](#16-getting-started)

---

## 1. Executive Summary

**CareFlow** is an AI-powered hospital care management platform designed to solve one of healthcare's most critical safety challenges: **shift handover communication failures**. When nurses and physicians change shifts, critical patient information can be lost, miscommunicated, or omitted — leading to preventable medical errors, adverse events, and even patient deaths.

CareFlow digitizes and standardizes the handoff process. Staff simply **record an audio note** about their patients. The system then automatically:

- **Transcribes** the audio (supporting 90+ languages, including Arabic/Darija dialects common in Moroccan hospitals)
- **Extracts structured clinical data** (vitals, risk factors, pending labs, action items) using AI
- **Generates standardized handoff reports** aligned with proven frameworks like I-PASS and SBAR
- **Embeds reports as vectors** to power semantic search and an AI-powered patient chart Q&A chat
- **Analyzes wound images** with AI for healing assessment and infection detection
- Provides a **real-time, role-based dashboard** for managing patients, beds, and shift transitions

The result: every handoff is documented, structured, searchable, and auditable — dramatically reducing the information gaps that cause medical errors.

---

## 2. The Problem: Shift Handover Communication Failures

### 2.1 What Is a Clinical Handoff?

A **handoff** (also called a handover or signout) is the process by which one healthcare provider communicates patient status and transfers responsibility to another. This happens at every shift change, during patient transfers between departments, and during care transitions.

According to the Agency for Healthcare Research and Quality (AHRQ), handoffs have been linked to adverse clinical events across every hospital setting — from emergency departments to intensive care units.

### 2.2 The Scale of the Problem

Clinical handoff failures are a **leading cause of preventable medical errors**:

- **80% of serious medical errors** involve miscommunication during care transitions, according to the Joint Commission.
- A landmark study found that **being cared for by a covering physician** (rather than the primary provider) was an independent risk factor for preventable adverse events.
- Communication failures between providers are the **single leading root cause** in closed malpractice claims involving emergency physicians and trainees.
- **Medication discrepancies** at handoff are a well-recognized, persistent source of error — patients' medication lists are frequently inaccurate or incomplete during transitions.
- The Joint Commission issued a **Sentinel Event Alert** in 2017 specifically addressing the inadequacy of hand-off communication and its role in patient harm.

### 2.3 Why Handoffs Fail

Traditional handoffs suffer from several systemic weaknesses:

| Problem | Description |
|---------|-------------|
| **Verbal-only communication** | Information shared only verbally is easily forgotten, misheard, or incomplete. Studies show verbal-only handoffs lose ~30% of critical information. |
| **Lack of standardization** | Without a standard format, each provider communicates differently. Critical data points are omitted unpredictably. |
| **Interruptions & distractions** | Hospital environments are noisy and fast-paced. Handoffs are frequently interrupted, leading to information loss. |
| **No written record** | Many handoffs produce no documentation, making them impossible to audit or review. |
| **Language barriers** | In multilingual healthcare settings (such as Moroccan hospitals where staff may use Arabic, Darija, and French), language barriers compound communication failures. |
| **Time pressure** | End-of-shift fatigue and urgency lead to rushed, incomplete handoffs. |
| **No structured follow-up** | To-do items and contingency plans are not tracked, leading to dropped tasks. |

### 2.4 Established Solutions: I-PASS and SBAR

The healthcare industry has developed standardized handoff frameworks to address these failures:

**I-PASS** (the gold standard, validated by the seminal I-PASS study):
- **I**llness severity — one-word acuity summary (stable, watcher, unstable)
- **P**atient summary — brief diagnoses and treatment plan
- **A**ction list — to-do items for the receiving clinician
- **S**ituation awareness & contingency plans — "if–then" directions for status changes
- **S**ynthesis by receiver — opportunity to ask questions and confirm the plan

**SBAR** (Situation, Background, Assessment, Recommendation):
- A structured framework ensuring communication is organized and complete.

The I-PASS study demonstrated that implementing a standardized handoff bundle **markedly reduced preventable adverse events**. The Joint Commission now requires hospitals to maintain formal handoff communication processes.

### 2.5 The Gap CareFlow Fills

While I-PASS and SBAR provide excellent frameworks, their adoption is inconsistent because they rely on **human discipline** to follow a checklist every time. CareFlow bridges this gap by:

1. **Automating structure extraction** — AI converts free-form speech into I-PASS-aligned structured reports
2. **Eliminating the documentation burden** — staff speak naturally; the system handles the rest
3. **Providing a permanent, searchable record** — every handoff is stored, timestamped, and queryable
4. **Breaking language barriers** — automatic transcription and translation (Arabic/Darija → French)
5. **Enabling accountability** — handoff acceptance workflow with digital signatures
6. **Supporting clinical decision-making** — AI-powered Q&A over patient history

---

## 3. How CareFlow Solves It

### 3.1 The Core Workflow

```
┌─────────────────────────────────────────────────────────┐
│                   OUTGOING NURSE                        │
│                                                         │
│  1. Select Patient                                      │
│  2. Press Record → Speak naturally about patient status │
│  3. Upload audio                                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   AI PIPELINE                           │
│                                                         │
│  4. ElevenLabs Scribe → Transcription (90+ languages)  │
│  5. Language detection → Arabic/Darija → French         │
│  6. MiniMax M2.5 → Extract structured clinical data:   │
│     • Summary, Consciousness, Pain level (0-10)        │
│     • Risk factors, Access lines, Pending labs          │
│     • To-do items (actionable tasks)                   │
│  7. Generate structured Handoff Report                  │
│  8. Embed report → Vector storage (pgvector)           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   INCOMING NURSE                        │
│                                                         │
│  9. View structured handoff report with all fields      │
│ 10. Review risk factors (highlighted in red)            │
│ 11. Check off to-do items                               │
│ 12. Accept handoff (digital signature)                  │
│ 13. Ask questions via AI Chat about patient history     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 How Each Feature Reduces Medical Errors

| CareFlow Feature | Handoff Problem Addressed | Error Reduction Mechanism |
|-----------------|---------------------------|--------------------------|
| **Audio recording + AI transcription** | Verbal-only communication, no written record | Creates a permanent, searchable transcript of every handoff |
| **Structured report extraction** | Lack of standardization | Forces I-PASS-aligned structure: severity, summary, action items, risk factors |
| **Pain level (0-10) + consciousness tracking** | Omitted vitals | AI extracts and displays vitals prominently; trends visible over time |
| **Risk factors (red banner)** | Buried critical information | High-risk conditions are visually highlighted and impossible to miss |
| **To-do items with checkboxes** | Dropped tasks | Actionable items are explicitly listed and trackable |
| **Pending labs display** | Forgotten follow-ups | Lab orders are extracted and displayed; nothing falls through the cracks |
| **Access lines tracking** | Equipment continuity gaps | IV lines, catheters, and drains are documented for the incoming nurse |
| **Handoff acceptance + signature** | No accountability | Incoming nurse must acknowledge receipt; creates an audit trail |
| **Multilingual transcription + translation** | Language barriers | Arabic/Darija speech is auto-translated to French for universal understanding |
| **AI Patient Chat (RAG)** | Difficulty accessing historical context | Incoming staff can ask questions about patient history in natural language |
| **Wound image analysis** | Subjective wound assessment | AI provides objective, structured wound evaluations with infection indicators |
| **Real-time updates** | Stale information | Reports and recordings update live via Supabase Realtime |
| **Role-based access** | Information overload / unauthorized access | Each role sees only relevant data; admin controls are restricted |

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (SPA)                                 │
│  React 18 + TypeScript + Vite                                        │
│  shadcn/ui + Tailwind CSS + Radix UI                                 │
│  i18next (EN/FR)                                                     │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │ Patients │ │  Beds    │ │ Handoff  │ │Recordings│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │  Admin   │ │  Bulk    │ │  Auth    │                            │
│  │  Users   │ │  Import  │ │          │                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                               │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  Auth (GoTrue)  │  │  Storage (S3)   │  │  Realtime (WS)      │  │
│  │  Email/Password │  │  audio_notices  │  │  handoff_reports     │  │
│  │  Role metadata  │  │  wound images   │  │  audio_notices       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    PostgreSQL Database                          │ │
│  │  pgvector extension (semantic embeddings)                      │ │
│  │  pg_net extension (HTTP calls from triggers)                   │ │
│  │  Row Level Security (RLS) on all tables                        │ │
│  │  9 tables + 5 enums + 2 RPC functions                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Edge Functions (Deno)                        │ │
│  │  process-audio  │ embed-report │ analyze-wound │ patient-chat  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────┬───────────────────────┘
                       │                       │
          ┌────────────┴────────┐    ┌─────────┴──────────┐
          ▼                     ▼    ▼                    ▼
  ┌──────────────┐  ┌──────────────┐ ┌──────────────┐
  │  ElevenLabs  │  │   MiniMax    │ │    Groq      │
  │  Scribe v2   │  │   M2.5 LLM  │ │  Llama 3.1   │
  │  (STT)       │  │  embo-01     │ │  70B (Chat)  │
  └──────────────┘  └──────────────┘ └──────────────┘
```

---

## 5. Technology Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework (SPA) |
| **TypeScript** | Type safety across the entire frontend |
| **Vite** | Build tool and dev server (port 8080) |
| **shadcn/ui** | Component library (48 components) based on Radix UI |
| **Tailwind CSS** | Utility-first styling with custom design tokens |
| **React Router DOM v6** | Client-side routing with protected routes |
| **i18next** | Internationalization (English + French) |
| **TanStack React Query** | Server state management and caching |
| **Recharts** | Data visualization charts |
| **xlsx** | Excel/CSV file parsing for bulk bed import |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |

### Backend (Supabase)
| Technology | Purpose |
|-----------|---------|
| **Supabase Auth** | Email/password authentication with role metadata |
| **Supabase PostgreSQL** | Primary database with RLS policies |
| **pgvector** | Vector similarity search for RAG-based patient chat |
| **pg_net** | HTTP calls from database triggers |
| **Supabase Storage** | Audio file and wound image storage |
| **Supabase Realtime** | Live WebSocket updates for handoffs and recordings |
| **Supabase Edge Functions** | Serverless Deno functions for AI processing |

### External AI Services
| Service | Purpose |
|---------|---------|
| **ElevenLabs Scribe v2** | Speech-to-text transcription (90+ languages) |
| **MiniMax M2.5** | LLM for structured data extraction, translation, wound analysis |
| **MiniMax embo-01** | Embedding model (384-dim vectors) for semantic search |
| **Groq (Llama 3.1 70B)** | Fast LLM inference for patient chart Q&A |

### Testing & DevOps
| Technology | Purpose |
|-----------|---------|
| **Vitest** | Unit testing framework |
| **Playwright** | End-to-end testing |
| **Netlify** | Frontend deployment (SPA with redirects) |
| **ESLint** | Code linting |

---

## 6. Core Features

### 6.1 Audio Recording & AI Transcription
- Staff select a patient and record audio directly in the browser using the MediaRecorder API (WebM format)
- Audio is uploaded to Supabase Storage and an `audio_notices` record is created
- A PostgreSQL trigger automatically invokes the `process-audio` edge function
- ElevenLabs Scribe v2 transcribes the audio with automatic language detection
- Arabic/Darija recordings are translated to French using MiniMax M2.5
- The system polls for completion and shows real-time progress

### 6.2 Structured Handoff Reports
- AI extracts structured clinical data from the transcript:
  - **Summary text** — concise patient status overview
  - **Pain level** — 0-10 scale with color coding (green → yellow → red)
  - **Consciousness level** — Alert, Drowsy, Confused, Sedated, or Unresponsive
  - **Risk factors** — highlighted in a red banner (e.g., fall risk, aspiration risk)
  - **Access lines** — IV lines, catheters, drains with status
  - **Pending labs** — outstanding lab orders and expected results
  - **To-do items** — actionable tasks with checkboxes for tracking
  - **Shift type** — Day or Night with appropriate icons
- Reports are displayed as rich `HandoffCard` components

### 6.3 Handoff Acceptance & Accountability
- Incoming nurses can formally accept a handoff report
- The system generates a cryptographic signature hash
- Acceptance is recorded with the acceptor's name, timestamp, and signature
- Creates an auditable trail of care responsibility transfer

### 6.4 AI-Powered Patient Chat (RAG)
- A floating chat widget on patient detail pages
- Users can ask natural language questions about patient history
- The system performs semantic search over embedded handoff reports using pgvector
- Matched context is sent to Groq (Llama 3.1 70B) for answer generation
- Responses include source citations (shift report dates and similarity scores)
- Helps incoming staff quickly understand patient context without reading every report

### 6.5 Wound Analysis
- Staff can upload wound images for AI-powered assessment
- MiniMax M2.5 vision model analyzes the image and returns:
  - Wound type and size
  - Healing stage assessment
  - Severity rating (mild, moderate, severe)
  - Infection indicators: erythema, pus, odor, warmth (each individually assessed)
  - Drainage description
  - Treatment recommendations
- Results displayed in a structured `WoundCard` component
- Supports doctor notes for clinical commentary

### 6.6 Patient Management
- Full CRUD operations for patient records
- Fields: name, age, gender, diagnosis, admission notes, admission/discharge dates
- Patient list with search and filter (Active/Discharged)
- Detailed patient profile with tabs for Handoff Reports, Recordings, and Wounds

### 6.7 Bed Management
- Ward-based bed inventory system
- Bed states: Available, Occupied, Maintenance
- Visual dashboard with stat cards (available/occupied/maintenance counts)
- Patient-bed assignment and unassignment
- Bulk import from Excel/CSV with AI-powered column mapping

### 6.8 Bulk Bed Import
- 4-step wizard: Upload → Column Mapping → Preview → Import
- Supports Excel (.xlsx) and CSV files
- Smart column auto-mapping using multilingual keyword dictionaries (English, French, Arabic)
- Fuzzy matching with scoring: exact (1.0), contains (0.8), word overlap (0.5-0.8), prefix (0.3)
- Duplicate detection and batch processing (20 beds at a time)

### 6.9 Dashboard
- Time-based greeting with current shift label (Day/Evening/Night)
- Stat cards: Total Patients, Available Beds, Handoff Reports, Recordings
- Recent handoff reports (last 5) and recent recordings (last 5)
- Quick action buttons for common tasks

### 6.10 Admin User Management
- Admin-only page for managing user roles and departments
- Role assignment: Administrator, Staff, Receptionist
- Department-based access control (per-ward visibility)

---

## 7. AI Pipeline

### 7.1 Audio Processing Pipeline (`process-audio`)

```
Audio Upload (WebM)
       │
       ▼
ElevenLabs Scribe v2 ──────────────────────────┐
  • Auto language detection                     │
  • 90+ language support                        │
  • Returns transcript + detected language      │
       │                                        │
       ▼                                        │
Language Check                                  │
  • If Arabic/Darija detected:                  │
    └─→ MiniMax M2.5 translation → French      │
  • Otherwise: use original transcript          │
       │                                        │
       ▼                                        │
MiniMax M2.5 — Structured Extraction            │
  • System prompt: "Clinical NLP assistant"     │
  • Extracts: tasks[], handoff_report{}         │
  • JSON output: title, description,            │
    priority, category for each task            │
       │                                        │
       ▼                                        │
Database Writes                                 │
  • Update audio_notices (transcript, status)   │
  • Insert tasks[]                              │
  • Insert handoff_report                       │
       │                                        │
       ▼                                        │
Embed Report (async)                            │
  • MiniMax embo-01 → 384-dim vector            │
  • Store in handoff_reports.embedding          │
```

### 7.2 Semantic Search & RAG (`patient-chat`)

```
User Question
       │
       ▼
MiniMax embo-01 → Query Embedding (384-dim)
       │
       ▼
PostgreSQL pgvector — Cosine Similarity Search
  • match_handoff_reports() RPC
  • Threshold: 0.3, Top-K: 3
  • Filters by patient_id
       │
       ▼
Context Assembly
  • Matched reports: summary, vitals, risk factors,
    access lines, labs, to-do items
       │
       ▼
Groq API — Llama 3.1 70B
  • System prompt: "Nursing assistant, cite sources"
  • Returns answer + source references
```

### 7.3 Wound Analysis (`analyze-wound`)

```
Wound Image (upload or URL)
       │
       ▼
MiniMax M2.5 (Vision)
  • Analyzes wound characteristics
  • Returns structured JSON:
    - wound_type, size
    - healing_stage, severity
    - infection_signs: {erythema, pus, odor, warmth}
    - drainage, recommendations
       │
       ▼
Database Write
  • Update wound_entries.analysis_json
```

---

## 8. Database Schema

### 8.1 Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **profiles** | User display names and avatars | id (FK → auth.users), display_name, avatar_url |
| **user_roles** | Role assignment | user_id (FK → auth.users), role (admin/staff/receptionist), department |
| **patients** | Patient records | id, name, age, gender, diagnosis, notes, admission_date, discharge_date, created_by |
| **beds** | Bed inventory | id, bed_number, ward, status (available/occupied/maintenance), patient_id |
| **audio_notices** | Audio recordings + transcripts | id, patient_id, user_id, audio_url, transcript, processed (boolean), language_detected |
| **tasks** | Extracted medical tasks | id, patient_id, audio_notice_id, title, description, priority, status, category, assigned_to |
| **handoff_reports** | Structured handoff reports | id, patient_id, author_id, audio_notice_id, shift_type, summary_text, pain_level, consciousness, pending_labs, access_lines, risk_factors, to_do_items, transcript_excerpt, embedding (vector) |
| **wound_entries** | Wound images + AI analysis | id, patient_id, image_url, analysis_json, doctor_notes, created_by |
| **handoff_acceptances** | Handoff acknowledgement records | id, handoff_id, accepted_by, signature_hash |

### 8.2 Enums

| Enum | Values |
|------|--------|
| `user_role` | admin, receptionist, staff |
| `bed_status` | available, occupied, maintenance |
| `shift_type` | day, night |
| `task_priority` | low, medium, high |
| `task_status` | pending, in_progress, completed |

### 8.3 Key Database Features

- **Row Level Security (RLS)** on all tables, enforced by a `get_user_role()` SECURITY DEFINER function
- **pgvector extension** for 384-dimensional embedding vectors on handoff_reports
- **pg_net extension** for HTTP calls from database triggers (auto-triggers audio processing)
- **Automatic triggers**: `handle_new_user` (auto-creates profile + role on signup), `update_updated_at_column` (timestamp management), `trigger_process_audio` (auto-processes new recordings)
- **RPC function**: `match_handoff_reports()` for cosine similarity vector search

### 8.4 Entity Relationship Diagram

```
auth.users
    │
    ├── profiles (1:1)
    ├── user_roles (1:1)
    │
    ├── patients (1:many, created_by)
    │       │
    │       ├── beds (1:1, patient_id)
    │       ├── audio_notices (1:many)
    │       │       │
    │       │       ├── tasks (1:many)
    │       │       └── handoff_reports (1:1)
    │       │               │
    │       │               └── handoff_acceptances (1:many)
    │       │
    │       └── wound_entries (1:many)
    │
    ├── audio_notices (1:many, user_id)
    ├── handoff_reports (1:many, author_id)
    ├── tasks (1:many, assigned_to)
    └── wound_entries (1:many, created_by)
```

---

## 9. User Roles & Access Control

CareFlow implements a three-tier role system enforced at both the database (RLS policies) and UI levels:

### 9.1 Administrator
- **Full access** to all features and data
- Can manage user roles and departments
- Can add, edit, and delete patients
- Can manage beds across all wards
- Can perform bulk bed imports
- Can view and record handoff reports
- Can access admin pages (User Management, Bulk Import)

### 9.2 Staff (Nurses/Clinicians)
- Can view and manage patients
- Can record audio handoffs and view reports
- Can upload and analyze wound images
- Can accept handoff reports
- Can use patient chart AI chat
- **Cannot** access admin pages or manage other users

### 9.3 Receptionist
- Can view patients and beds
- Can manage bed assignments
- Can view handoff reports (read-only)
- **Cannot** record handoffs or manage patients
- **Cannot** access admin features

### 9.4 Access Control Matrix

| Feature | Admin | Staff | Receptionist |
|---------|:-----:|:-----:|:------------:|
| Dashboard | ✅ | ✅ | ✅ |
| View Patients | ✅ | ✅ | ✅ |
| Add/Edit Patients | ✅ | ✅ | ❌ |
| Delete Patients | ✅ | ❌ | ❌ |
| View Beds | ✅ | ✅ | ✅ |
| Manage Beds | ✅ | ❌ | ✅ |
| View Handoff Reports | ✅ | ✅ | ✅ |
| Record Handoffs | ✅ | ✅ | ❌ |
| Accept Handoffs | ✅ | ✅ | ❌ |
| Upload Wound Images | ✅ | ✅ | ❌ |
| AI Patient Chat | ✅ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Bulk Import | ✅ | ❌ | ❌ |

---

## 10. Application Pages

### 10.1 Authentication (`/auth`)
- Split-screen layout: branding panel (left) + login/register form (right)
- Email/password authentication via Supabase Auth
- Role selection during registration (Staff, Receptionist, Administrator)
- User metadata (display name, role) stored in auth metadata and synced to database via trigger

### 10.2 Dashboard (`/`)
- Time-aware greeting with current shift indicator (Day: 7am-3pm, Evening: 3pm-11pm, Night: 11pm-7am)
- Four stat cards: Total Patients, Available Beds, Handoff Reports, Total Recordings
- Recent handoff reports and recordings lists
- Quick action navigation buttons

### 10.3 Patients (`/patients`)
- Searchable, filterable patient list with bed assignment info
- Add Patient dialog with required name and optional clinical fields
- Click-through to detailed patient profile

### 10.4 Patient Detail (`/patients/:id`)
- Patient header: initials avatar, demographics, diagnosis, bed info
- Three tabs:
  - **Handoff Reports**: chronological list of structured handoff cards
  - **Recordings**: audio playback with transcript and linked report
  - **Wounds**: wound image gallery with AI analysis cards
- Inline edit form (admin/staff only)
- Bed assignment selector (admin/receptionist)
- Floating AI Chat widget for patient Q&A
- Delete patient (admin only, with confirmation)

### 10.5 Beds (`/beds`)
- Visual bed management dashboard grouped by ward
- Stat cards: Available, Occupied, Maintenance, Total
- Status change, patient assignment/unassignment
- Add bed dialog with bed number, ward, and initial status

### 10.6 Handoff Reports (`/handoff`)
- Split layout: patient list (left) + handoff report history (right)
- Patient cards show diagnosis, age, and report count
- Real-time subscription for new incoming reports
- Deep-linking support via URL parameters

### 10.7 Recordings (`/recordings`)
- Complete recording workflow: patient selection → audio capture → upload → processing
- Browser-based audio recording using MediaRecorder API
- Upload progress and AI processing status with polling
- Historical recordings list with playback, transcript, and linked handoff data
- Retry button for failed processing

### 10.8 Admin Users (`/admin/users`)
- Admin-only user management interface
- Lists all users with display name, email, role, department
- Role modification via dropdown
- Department assignment for ward-based access control

### 10.9 Bulk Import (`/admin/bulk-import`)
- 4-step wizard for importing beds from spreadsheets
- Step 1: File upload (drag & drop or file picker)
- Step 2: AI-powered column mapping with manual override
- Step 3: Preview with department summary and per-row editing
- Step 4: Batch import with progress bar and results summary

### 10.10 Not Found (`/*`)
- 404 error page with navigation back to home

---

## 11. Edge Functions (Backend)

All backend AI processing runs on **Supabase Edge Functions** (Deno runtime):

### 11.1 `process-audio`
- **Trigger**: Database trigger on `audio_notices` INSERT, or manual retry from frontend
- **Pipeline**: Download audio → ElevenLabs STT → Language detection → Translation (if Arabic) → MiniMax structured extraction → Write handoff report + tasks
- **External APIs**: ElevenLabs, MiniMax M2.5

### 11.2 `embed-report`
- **Trigger**: Called after handoff report creation
- **Pipeline**: Build text from report fields → MiniMax embo-01 embedding (384-dim) → Store in `handoff_reports.embedding`
- **Supports**: Single report or batch mode (all unembedded reports)

### 11.3 `analyze-wound`
- **Trigger**: User clicks "Analyze with AI" on wound image
- **Pipeline**: Fetch/receive image → MiniMax M2.5 vision analysis → Structured JSON response → Store in `wound_entries.analysis_json`

### 11.4 `patient-chat`
- **Trigger**: User sends a question in the patient chat widget
- **Pipeline**: Embed query → pgvector similarity search → Build context from top-3 matched reports → Groq Llama 3.1 70B answer generation → Return with sources

---

## 12. Internationalization

CareFlow supports **English** and **French** throughout the entire UI:

- **Framework**: i18next with `react-i18next`
- **Language files**: `src/i18n/en.json` and `src/i18n/fr.json` (~340 translation keys each)
- **Coverage**: All navigation, page titles, form labels, buttons, status messages, error messages, and feature-specific text
- **Persistence**: Language preference saved to `localStorage` (`careflow-lang` key)
- **Toggle**: Language switcher in the sidebar (🌐 icon)
- **French variant**: Professional Moroccan hospital French, appropriate for the North African healthcare context

### Audio Processing Multilingual Support
- ElevenLabs Scribe v2 supports **90+ languages** for transcription
- Automatic language detection on audio input
- Arabic and Darija (Moroccan Arabic) recordings are **automatically translated to French** via MiniMax M2.5
- This is critical for Moroccan hospitals where staff may speak Darija verbally but documentation is in French

---

## 13. Real-Time Features

CareFlow uses **Supabase Realtime** (WebSocket-based) for live data updates:

| Table | Events | Effect |
|-------|--------|--------|
| `handoff_reports` | INSERT | New handoff reports appear instantly on the Handoff page |
| `audio_notices` | UPDATE | Recording status changes (processing → completed) update in real-time |
| `handoff_reports` | INSERT | Dashboard updates with latest reports |

This ensures incoming nurses see new handoff reports as soon as they are generated, without needing to refresh the page.

---

## 14. Deployment

### Frontend
- **Platform**: Netlify
- **Build command**: `npm run build`
- **Publish directory**: `dist/`
- **Node version**: 20
- **SPA routing**: `/* → /index.html (200)` redirect rule

### Backend
- **Platform**: Supabase (hosted)
- **Project ID**: `vazabyivbhzaakunjcpp`
- **Edge Functions**: Deployed via Supabase CLI
- **Environment variables** (set in Netlify & Supabase):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `ELEVENLABS_API_KEY` (Edge Functions)
  - `MINIMAX_API_KEY` (Edge Functions)
  - `GROQ_API_KEY` (Edge Functions)

---

## 15. Project Structure

```
care-companion/
├── public/                          # Static assets
│   ├── _redirects                   # Netlify SPA redirect
│   └── robots.txt                   # Search engine rules
│
├── src/
│   ├── main.tsx                     # App entry point
│   ├── App.tsx                      # Root component with routing
│   ├── index.css                    # Global styles + design tokens
│   ├── App.css                      # (Legacy, unused)
│   ├── vite-env.d.ts                # Vite type declarations
│   │
│   ├── components/
│   │   ├── AppLayout.tsx            # Main layout wrapper (sidebar + content)
│   │   ├── AppSidebar.tsx           # Role-based navigation sidebar
│   │   ├── DataTable.tsx            # Generic typed table component
│   │   ├── HandoffCard.tsx          # Structured handoff report card
│   │   ├── NavLink.tsx              # Active-state navigation link
│   │   ├── ProtectedRoute.tsx       # Auth guard for routes
│   │   ├── StatCard.tsx             # Dashboard statistic card
│   │   ├── StatusBadge.tsx          # Configurable status/priority badge
│   │   │
│   │   ├── chat/
│   │   │   └── ChartChat.tsx        # AI-powered patient Q&A widget
│   │   ├── handoff/
│   │   │   └── AcceptButton.tsx     # Handoff acceptance with signature
│   │   ├── patient/
│   │   │   └── WoundCard.tsx        # Wound image + AI analysis card
│   │   │
│   │   └── ui/                      # 48 shadcn/ui components
│   │       ├── accordion.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── ... (48 components)
│   │       └── tooltip.tsx
│   │
│   ├── contexts/
│   │   └── ThemeContext.tsx          # Dark/light theme management
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx              # Authentication context + role management
│   │   ├── use-mobile.tsx           # Responsive breakpoint hook
│   │   └── use-toast.ts             # Toast notification state
│   │
│   ├── i18n/
│   │   ├── index.ts                 # i18next configuration
│   │   ├── en.json                  # English translations (~340 keys)
│   │   └── fr.json                  # French translations (~340 keys)
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts            # Supabase client initialization
│   │       └── types.ts             # Auto-generated database types (548 lines)
│   │
│   ├── lib/
│   │   └── utils.ts                 # cn() class name utility
│   │
│   ├── pages/
│   │   ├── Auth.tsx                 # Login/register page
│   │   ├── Dashboard.tsx            # Main dashboard
│   │   ├── Patients.tsx             # Patient list
│   │   ├── PatientDetail.tsx        # Patient profile + tabs
│   │   ├── Beds.tsx                 # Bed management
│   │   ├── Handoff.tsx              # Handoff report viewer
│   │   ├── Recordings.tsx           # Audio recording + processing
│   │   ├── AdminUsers.tsx           # User role management
│   │   ├── BulkImport.tsx           # Excel/CSV bed import wizard
│   │   ├── Tasks.tsx                # Task board (orphan page)
│   │   ├── Index.tsx                # Redirect placeholder
│   │   └── NotFound.tsx             # 404 page
│   │
│   ├── test/
│   │   ├── setup.ts                 # Test environment setup
│   │   └── example.test.ts          # Sample test
│   │
│   └── utils/
│       └── excelColumnMapper.ts     # AI-powered column mapping for bulk import
│
├── supabase/
│   ├── config.toml                  # Supabase project configuration
│   │
│   ├── functions/                   # Edge Functions (Deno)
│   │   ├── process-audio/           # Audio → transcript → structured report
│   │   ├── embed-report/            # Report → vector embedding
│   │   ├── analyze-wound/           # Wound image → AI analysis
│   │   └── patient-chat/            # RAG-based patient Q&A
│   │
│   └── migrations/                  # Database migrations (7 files)
│       ├── 20260214001031_*.sql     # Core schema (tables, enums, RLS, triggers)
│       ├── 20260214001047_*.sql     # Policy tightening
│       ├── 20260214120000_*.sql     # Task/audio update policy fix
│       ├── 20260214130000_*.sql     # Auto-process audio trigger
│       ├── 20260214131000_*.sql     # Enable realtime
│       ├── 20260214200000_*.sql     # Handoff reports table
│       └── 20260215000000_*.sql     # pgvector, wounds, acceptances, embeddings
│
├── package.json                     # Dependencies and scripts
├── vite.config.ts                   # Vite configuration
├── vitest.config.ts                 # Test configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
├── eslint.config.js                 # ESLint configuration
├── netlify.toml                     # Netlify deployment config
├── components.json                  # shadcn/ui configuration
└── README.md                        # Basic readme
```

---

## 16. Getting Started

### Prerequisites
- **Node.js** 20+
- **Bun** or **npm** package manager
- A **Supabase** project (with Edge Functions enabled)
- API keys for: **ElevenLabs**, **MiniMax**, **Groq**

### Installation

```bash
# Clone the repository
git clone https://github.com/omorakwant/care-companion.git
cd care-companion

# Install dependencies
bun install   # or: npm install

# Set up environment variables
# Create a .env file with:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start the development server
bun run dev   # or: npm run dev
# App will be available at http://localhost:8080
```

### Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your_project_ref

# Apply database migrations
supabase db push

# Deploy edge functions
supabase functions deploy process-audio
supabase functions deploy embed-report
supabase functions deploy analyze-wound
supabase functions deploy patient-chat

# Set edge function secrets
supabase secrets set ELEVENLABS_API_KEY=your_key
supabase secrets set MINIMAX_API_KEY=your_key
supabase secrets set GROQ_API_KEY=your_key
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `bun run dev` | Start Vite dev server on port 8080 |
| Build | `bun run build` | Production build to `dist/` |
| Preview | `bun run preview` | Preview production build locally |
| Lint | `bun run lint` | Run ESLint |
| Test | `bun run test` | Run Vitest tests |

---

## Summary

CareFlow transforms hospital shift handovers from error-prone verbal exchanges into **structured, AI-processed, searchable, and accountable digital records**. By automating the extraction of clinical data from natural speech, it ensures that every handoff contains the critical information required by frameworks like I-PASS — without adding documentation burden to already-overworked healthcare staff.

The system directly addresses the root causes of handoff-related medical errors:
- **Verbal-only handoffs** → permanent audio + text records
- **Lack of standardization** → AI-enforced structured reports
- **Language barriers** → 90+ language transcription with auto-translation
- **Dropped tasks** → explicit to-do tracking with checkboxes
- **No accountability** → digital handoff acceptance with signatures
- **Lost context** → AI-powered semantic search over patient history

In a healthcare system where communication failures during shift changes are responsible for the majority of preventable adverse events, CareFlow represents a meaningful step toward safer patient care.

---

*Built with ❤️ for healthcare workers everywhere.*
