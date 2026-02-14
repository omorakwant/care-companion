

# CareFlow — MVP Prototype Plan

## Overview
CareFlow is a hospital staff productivity platform where medical staff can record audio notes about patients, which are automatically transcribed and converted into actionable to-do tasks using AI. Built on Supabase (Lovable Cloud) for auth, database, storage, and edge functions.

---

## Phase 1: Foundation & Authentication

### Login & Signup
- Clean login page with email/password authentication
- Signup flow with role selection (Admin, Receptionist, Staff)
- Protected routes — redirect unauthenticated users to login

### Role-Based Access
- Three roles: **Admin**, **Receptionist**, **Staff**
- Roles stored in a dedicated `user_roles` table (not on profiles)
- Role-based navigation: each role sees only their relevant pages

### App Shell & Navigation
- Sidebar layout with role-aware menu items
- Header with user info, role badge, and logout
- Responsive design for tablet use (common in hospitals)

---

## Phase 2: Patient & Bed Management

### Patient Registry
- List of patients with search and filter
- Add/edit patient form (name, age, diagnosis, admission date, assigned bed)
- Patient detail page showing history and linked audio notices

### Bed Inventory
- Visual grid of beds showing availability (available, occupied, maintenance)
- Assign/unassign patients to beds
- Quick status toggle for bed availability
- Receptionist and Admin can manage beds; Staff can view

---

## Phase 3: Audio Recording & AI Pipeline

### Audio Recording (Patient Page)
- Record audio directly in the browser on a patient's page
- Audio files uploaded to Supabase Storage
- Each recording is linked to a patient and the staff member who recorded it

### AI Transcription & Task Extraction
- Supabase Edge Function receives the audio file reference
- Lovable AI (Gemini) processes the transcript and extracts structured to-do tasks
- Each task gets: title, description, priority (low/medium/high), category, and assigned patient
- Tasks are saved to the database and appear on the staff dashboard

---

## Phase 4: Staff To-Do Dashboard

### Task List
- Filterable list of AI-extracted tasks (by patient, priority, status, category)
- Each task shows: title, patient name, priority badge, status, created time
- Staff can mark tasks as complete, in-progress, or pending

### Task Detail
- View full task with original transcript excerpt
- Link back to the patient page
- Add notes or comments to tasks

---

## Phase 5: Admin Panel

### User Management
- Admin can view all users and their roles
- Invite new staff members
- Change user roles

### Dashboard Overview
- Summary stats: total patients, occupied beds, pending tasks, recordings today
- Quick overview cards for Admin to monitor hospital activity

---

## Database Structure (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | User display name, avatar |
| `user_roles` | Role assignments (admin/receptionist/staff) |
| `patients` | Patient records |
| `beds` | Bed inventory with status |
| `audio_notices` | Audio recording metadata + storage URLs |
| `tasks` | AI-extracted to-do items linked to patients |

All tables secured with Row-Level Security policies based on user roles.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind + Shadcn UI |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL with RLS |
| File Storage | Supabase Storage (audio files) |
| AI Pipeline | Lovable AI (Gemini) via Edge Function |
| Backend Logic | Supabase Edge Functions |

