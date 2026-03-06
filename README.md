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
3. In [Google Cloud Console](https://console.cloud.google.com):
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret
4. Paste them in Supabase **Authentication → Providers → Google**
5. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
6. Go to **Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

### 2. Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase URL and anon key
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Start dev server
npm run dev
```

### 3. Deploy to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and create a **Static Site**
3. Connect your GitHub repo
4. Configure:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
5. Add **Environment Variables** in Render dashboard:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Deploy

### 4. Supabase Redirect URL for Production

After deploying, add your Render URL to Supabase:

1. Supabase → **Authentication → URL Configuration**
2. Add to **Redirect URLs:** `https://your-app.onrender.com`
3. Set **Site URL** to your Render URL if desired

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
