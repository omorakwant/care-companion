# CareFlow — Hospital Care Companion

> **CureCode Hackathon 2026** — Built by **Oussama Dahriz**, **Amine Rajma**, and **Oussama Belharchi**

CareFlow is an AI-powered hospital shift handoff platform that transforms verbal patient handovers into structured, searchable, and accountable digital records — reducing the communication failures that cause **80% of serious medical errors**.

---

## 🏥 What It Does

Nurses simply **record an audio note** about their patients at shift change. CareFlow then automatically:

- **Transcribes** the audio in 90+ languages (including Arabic/Darija)
- **Extracts structured clinical data** — vitals, risk factors, pending labs, action items
- **Generates standardized handoff reports** aligned with I-PASS and SBAR frameworks
- **Powers an AI chat** for incoming staff to ask questions about patient history
- **Analyzes wound images** with AI for healing assessment and infection detection

No more lost information, no more forgotten tasks, no more undocumented handoffs.

---

## 🏆 Hackathon

This project was built during the **CureCode Hackathon**, organized by the **1337WebDev Club** in partnership with:

- **[Makeness](https://makeness.dev)**
- **[Cursor](https://cursor.com)**
- **[ElevenLabs](https://elevenlabs.io)**
- **[MiniMax](https://www.minimax.io)**

**Sponsored by:**

- **[1337](https://1337.ma)** (UM6P)
- **UM6P Hospitals**
- **FMS** (Faculty of Medicine and Surgery)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) |
| Speech-to-Text | ElevenLabs Scribe v2 |
| LLM / Vision | MiniMax M2.5, MiniMax embo-01 |
| RAG Chat | Groq (Llama 3.1 70B) + pgvector |
| Deployment | Netlify |

---

## 🚀 Quick Start

```bash
git clone https://github.com/omorakwant/care-companion.git
cd care-companion
npm install
cp .env.example .env   # Fill in your Supabase credentials
npm run dev             # http://localhost:8080
```

For the full architecture, database schema, AI pipeline details, and deployment guide, see **[DOCUMENTATION.md](./DOCUMENTATION.md)**.

---

## 📄 License

MIT
