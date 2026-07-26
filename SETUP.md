# SubSight — Setup Guide

No Reddit API credentials needed. SubSight uses Reddit's public JSON API.

---

## Step 1: Configure your Anthropic API key

```bash
cd C:\Users\srina\OneDrive\Desktop\reddit-intel\backend
copy .env.example .env
```

Edit `backend\.env` and add:
```
ANTHROPIC_API_KEY=your_key_here
```

Get your key at: https://console.anthropic.com/keys

---

## Step 2: Install backend dependencies

```powershell
cd C:\Users\srina\OneDrive\Desktop\reddit-intel\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

---

## Step 3: Install frontend dependencies

```powershell
cd C:\Users\srina\OneDrive\Desktop\reddit-intel\frontend
npm install
```

---

## Step 4: Run both servers

**Terminal 1 — Backend:**
```powershell
cd C:\Users\srina\OneDrive\Desktop\reddit-intel\backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd C:\Users\srina\OneDrive\Desktop\reddit-intel\frontend
npm run dev
```

Open: **http://localhost:5173**

---

## How to use

1. Type a topic (e.g. `hydration`) → click **Research**
2. Wait 3–5 minutes while it:
   - Discovers relevant subreddits via Reddit's public API
   - Scrapes 200 posts + comments (no login required)
   - Profiles user histories for cross-interests
   - Runs NLP (sentiment, topics, NER)
   - Calls Claude Sonnet for personas + pain points
3. Explore all 6 dashboard tabs
4. Click **Ask AI** to chat with your data

---

## Cost estimates

| Action | Cost |
|--------|------|
| One full research run | ~$0.05–$0.20 |
| One chat message | ~$0.001–$0.003 |

---

## Troubleshooting

**"Anthropic API error"** → Check ANTHROPIC_API_KEY in backend\.env

**"spacy model not found"** → Run: `python -m spacy download en_core_web_sm`

**Frontend shows connection error** → Make sure the backend is running on port 8000

**Reddit returns empty data** → Reddit rate-limits heavy usage. Wait 1–2 minutes and try again.
