# CareFlow - Hospital Care Companion

CareFlow is a hospital care management application that enables medical staff to record audio notes about patients, automatically transcribe them, and extract actionable medical tasks using AI.

## Features

- **Audio Recording** - Staff record voice notes per patient
- **AI Transcription** - Automatic multilingual speech-to-text (English, French, Arabic, and 90+ languages)
- **AI Task Extraction** - Structured medical tasks extracted from transcripts
- **Patient Management** - Admissions, records, and notes
- **Bed Management** - Ward and bed status tracking
- **Task Board** - Prioritized task management with status tracking
- **Role-Based Access** - Admin, Receptionist, and Staff roles with granular permissions

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Speech-to-Text | ElevenLabs Scribe v2 |
| Task Extraction | MiniMax M2.5 LLM |
| Testing | Vitest, Playwright |

---

## External APIs

### 1. Supabase

**What it does:** Provides the entire backend infrastructure - database, authentication, file storage, and serverless edge functions.

**How it's used:**

- **Database (PostgreSQL):** Stores all application data - patients, beds, tasks, audio notices, user profiles, and roles. Row-Level Security (RLS) policies enforce access control at the database level.
- **Authentication:** Handles user sign-up, login, and session management with email/password auth. On sign-up, a database trigger (`handle_new_user`) auto-creates a profile and assigns a role.
- **Storage:** The `audio-recordings` bucket stores uploaded audio files from staff. Files are private and only accessible to authenticated users.
- **Edge Functions:** The `process-audio` function (Deno runtime) orchestrates the AI transcription and task extraction pipeline. It's invoked via a Database Webhook when a new audio notice is created.

**Environment variables:**

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (.env) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend (.env) | Supabase anon/public API key |
| `SUPABASE_URL` | Edge Function (auto-injected) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function (auto-injected) | Service role key for admin-level DB access |

**Files:**
- `src/integrations/supabase/client.ts` - Frontend Supabase client initialization
- `src/integrations/supabase/types.ts` - Auto-generated TypeScript types for the database schema
- `supabase/migrations/*.sql` - Database schema and RLS policies
- `supabase/config.toml` - Supabase project configuration

---

### 2. ElevenLabs (Speech-to-Text)

**What it does:** Transcribes audio recordings into text using the Scribe v2 model.

**How it's used in the codebase:**

The `transcribeAudio()` function in `supabase/functions/process-audio/index.ts` sends audio files to ElevenLabs for transcription. This is **Step 3** in the audio processing pipeline.

**API details:**

| Property | Value |
|---|---|
| Endpoint | `https://api.elevenlabs.io/v1/speech-to-text` |
| Method | `POST` (multipart/form-data) |
| Model | `scribe_v2` |
| Auth header | `xi-api-key: <ELEVENLABS_API_KEY>` |

**Request flow:**
1. Audio blob is downloaded from Supabase Storage
2. Sent to ElevenLabs as a `FormData` upload (`file` field, `recording.webm`)
3. Language is auto-detected (no `language_code` parameter sent)
4. Response includes `text`, `language_code` (ISO-639), and `language_probability`

**Language support:** Auto-detects 90+ languages. Primary targets are English, French, and Arabic.

**Environment variables:**

| Variable | Where | Description |
|---|---|---|
| `ELEVENLABS_API_KEY` | Supabase Edge Function secrets | API key from [ElevenLabs Dashboard](https://elevenlabs.io/) |

**File:** `supabase/functions/process-audio/index.ts` (lines 10-51)

---

### 3. MiniMax (Task Extraction LLM)

**What it does:** Analyzes the transcribed text and extracts structured medical tasks using the MiniMax M2.5 large language model.

**How it's used in the codebase:**

The `extractTasks()` function in `supabase/functions/process-audio/index.ts` sends the transcript to MiniMax with a detailed system prompt. This is **Step 4** in the audio processing pipeline. This step is **optional** - if `MINIMAX_API_KEY` is not set, task extraction is skipped and only the transcript is saved.

**API details:**

| Property | Value |
|---|---|
| Endpoint | `https://api.minimax.io/v1/chat/completions` |
| Method | `POST` (JSON) |
| Model | `MiniMax-M2.5` |
| Auth header | `Authorization: Bearer <MINIMAX_API_KEY>` |
| Temperature | `0.2` (low creativity for structured extraction) |

**Request flow:**
1. A system prompt instructs the model to act as a medical task extractor
2. The transcript text and detected language are sent
3. The model returns a JSON object with a `tasks` array
4. Each task includes: `title`, `description`, `priority` (low/medium/high), `category`

**Task categories:** Medication, Vitals, Lab Work, Imaging, Consultation, Nursing Care, Discharge Planning, Other

**Multilingual behavior:** The system prompt instructs the model to write task titles and descriptions in the **same language as the transcript**. Language name is resolved from the ISO-639 code detected by ElevenLabs.

**Environment variables:**

| Variable | Where | Description |
|---|---|---|
| `MINIMAX_API_KEY` | Supabase Edge Function secrets | API key from [MiniMax Platform](https://www.minimax.io/) |

**File:** `supabase/functions/process-audio/index.ts` (lines 53-145)

---

## Audio Processing Pipeline

The `process-audio` Edge Function orchestrates the full pipeline when triggered:

```
┌─────────────────┐
│  Audio Uploaded  │  Staff records audio for a patient
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database Webhook │  Triggers on INSERT into audio_notices
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  1. Fetch audio  │  Download from Supabase Storage
│     notice       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Transcribe   │  ElevenLabs Scribe v2
│     (STT)        │  → text + language_code
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Extract      │  MiniMax M2.5
│     Tasks (LLM)  │  → structured task list
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Save results │  Update audio_notices (transcript)
│                  │  Insert into tasks table
└─────────────────┘
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User display names and avatars (auto-created on sign-up) |
| `user_roles` | Maps users to roles: `admin`, `receptionist`, `staff` |
| `patients` | Patient records with admission info, diagnosis, notes |
| `beds` | Bed inventory with ward, status (`available`/`occupied`/`maintenance`) |
| `audio_notices` | Audio recordings linked to patients, with transcript and processing status |
| `tasks` | Medical tasks extracted from audio, with priority, status, category, and assignment |

---

## Environment Setup

### Frontend

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Edge Function Secrets

Set these in the Supabase Dashboard under **Edge Functions > Secrets**, or via CLI:

```bash
npx supabase secrets set ELEVENLABS_API_KEY=your-elevenlabs-key
npx supabase secrets set MINIMAX_API_KEY=your-minimax-key
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

---

## Getting Started

```sh
# Clone the repository
git clone https://github.com/omorakwant/care-companion.git
cd care-companion

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env   # Then fill in your Supabase credentials

# Start the development server
npm run dev
```

The app runs at `http://localhost:8080`.

### Supabase CLI (for migrations and edge functions)

```bash
# Login
npx supabase login

# Link to your project
npx supabase link --project-ref vazabyivbhzaakunjcpp

# Push database migrations
npx supabase db push

# Deploy edge functions
npx supabase functions deploy process-audio
```

---

## Project Structure

```
care-companion/
├── src/
│   ├── components/       # UI components (shadcn/ui + custom)
│   ├── hooks/            # React hooks (auth, toast, mobile)
│   ├── integrations/     # Supabase client and types
│   ├── lib/              # Utility functions
│   ├── pages/            # Route pages (Dashboard, Patients, Tasks, etc.)
│   └── App.tsx           # Router and providers
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   │   └── process-audio/index.ts
│   ├── migrations/       # SQL migrations (schema, RLS, extensions)
│   └── config.toml       # Supabase project config
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Deployment

Deploy via [Lovable](https://lovable.dev) (Share > Publish) or build manually:

```bash
npm run build    # Output in dist/
npm run preview  # Preview the production build
```
