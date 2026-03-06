# K-Map Circuit Designer

A web application for designing circuits based on Karnaugh maps. Users can fill out K-maps (up to 4×4), get minimized Boolean functions in SOP and POS form with prime implicants, and visualize the resulting circuits.

## Features

- **Google Login** – Required for saving and viewing history
- **K-Map Editor** – 2×2, 2×4 (A\BC), and 4×4 (AB\CD) layouts with Gray code ordering
- **Minimization** – SOP and POS forms with prime implicant identification
- **Circuit Design** – Visual representation of SOP and POS circuits
- **History** – Save and view your past K-map designs

## Tech Stack

- **Frontend:** React, Vite
- **Backend/Auth/DB:** Supabase
- **Deployment:** Render

---

## Setup Instructions

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Authentication → Providers** and enable **Google**
3. In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials:
   - Create OAuth 2.0 credentials (Web application) or edit existing
   - **Critical:** Under "Authorized redirect URIs", add **only** this (use your Supabase project ref):
     ```
     https://qtgyucdlgqrvvpypelnu.supabase.co/auth/v1/callback
     ```
   - **Remove** any `http://localhost:5173` or your app URL—Google must redirect to Supabase
   - Copy Client ID and Client Secret
4. Paste them in Supabase **Authentication → Providers → Google**
5. Go to **Authentication → URL Configuration** and add your redirect URLs:
   - For local dev: `http://localhost:5173` and `http://localhost:5173/`
   - For production: your Render URL (e.g. `https://your-app.onrender.com`)
6. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
7. Go to **Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

**Troubleshooting "Unable to exchange external code":** This means the Google OAuth redirect URI is wrong. In Google Cloud Console, the redirect URI must be exactly `https://qtgyucdlgqrvvpypelnu.supabase.co/auth/v1/callback` (no trailing slash). Remove localhost from the list. Also ensure the Client ID and Secret in Supabase match the same OAuth client.

### 2. Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase URL and anon key
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Optional: VITE_GEMINI_API_KEY for correct K-map minimization (get from aistudio.google.com/apikey)

# Start dev server
npm run dev
```

### 3. Deploy to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and create a **Static Site**
3. Connect your GitHub repo
4. Configure (or use the included `render.yaml` blueprint):
   - **Build Command:** `npm install && npm run build` (use both—`vite` must be installed first)
   - **Publish Directory:** `dist`
5. Add **Environment Variables** in Render dashboard:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Deploy

### 4. Supabase Redirect URL (required for login to work)

Add your app URL to Supabase **before** testing login:

1. Supabase → **Authentication → URL Configuration**
2. Add to **Redirect URLs:**
   - Local: `http://localhost:5173` and `http://localhost:5173/`
   - Production: `https://your-app.onrender.com` (replace with your actual Render URL)
3. Set **Site URL** to your app URL if desired

---

## Project Structure

```
├── src/
│   ├── components/     # KMapGrid, CircuitDiagram, Layout
│   ├── lib/           # supabase client, kmap minimization logic
│   ├── pages/         # Login, KMapDesigner, History
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── schema.sql     # Database schema
├── .env.example
├── package.json
└── vite.config.js
```

## K-Map Formats

- **2×2:** A\B – 2 variables
- **2×4:** A\BC – 3 variables (rows = A, columns = BC in Gray code)
- **4×4:** AB\CD – 4 variables (rows = AB, columns = CD in Gray code)

## License

MIT
