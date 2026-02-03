# Deployment Guide - Kalkyle 1.0

## Oversikt

- **Frontend**: Vercel (gratis)
- **Backend**: Render (gratis med persistent disk)
- **Database**: SQLite (lagret på Render disk)

---

## Steg 1: Forbered koden

1. Opprett et Git repository:
```bash
cd "C:\Prosjekt\Kalkyle 1.0"
git init
git add .
git commit -m "Initial commit"
```

2. Push til GitHub:
   - Opprett et nytt repository på github.com
   - Følg instruksjonene for å pushe eksisterende repo

---

## Steg 2: Deploy Backend til Render

1. Gå til [render.com](https://render.com) og logg inn

2. Klikk **New +** → **Web Service**

3. Koble til ditt GitHub repository

4. Konfigurer tjenesten:
   - **Name**: `kalkyle-api`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. Under **Advanced** → **Add Disk**:
   - **Name**: `kalkyle-data`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (gratis tier)

6. Legg til Environment Variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (generer en sikker nøkkel, f.eks. via https://randomkeygen.com)
   - `FRONTEND_URL` = (legg til etter Vercel deploy)

7. Klikk **Create Web Service**

8. Vent til deploy er ferdig og noter URL-en (f.eks. `https://kalkyle-api.onrender.com`)

---

## Steg 3: Deploy Frontend til Vercel

1. Gå til [vercel.com](https://vercel.com) og logg inn

2. Klikk **Add New** → **Project**

3. Importer ditt GitHub repository

4. Konfigurer prosjektet:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Legg til Environment Variable:
   - `VITE_API_URL` = `https://din-render-url.onrender.com/api`

   (Bytt ut med din faktiske Render URL fra steg 2)

6. Klikk **Deploy**

7. Vent til deploy er ferdig og noter URL-en (f.eks. `https://kalkyle.vercel.app`)

---

## Steg 4: Oppdater CORS på Backend

1. Gå tilbake til Render dashboard

2. Under Environment Variables, legg til/oppdater:
   - `FRONTEND_URL` = `https://din-vercel-url.vercel.app`

3. Render vil automatisk redeploy

---

## Ferdig!

Appen din er nå live på internett:
- **Frontend**: `https://din-app.vercel.app`
- **Backend API**: `https://din-app.onrender.com/api`

---

## Viktig informasjon

### Gratis tier begrensninger

**Render (gratis)**:
- Serveren går i dvale etter 15 min inaktivitet
- Første request etter dvale tar ~30 sekunder
- 750 timer gratis per måned

**Vercel (gratis)**:
- 100 GB båndbredde per måned
- Ingen begrensninger på oppetid

### Oppgradering

For å unngå at serveren går i dvale, oppgrader til Render Starter ($7/mnd).

### Backup av database

Databasen lagres på Render disk. For backup:
1. SSH inn på Render (krever betalt plan)
2. Kopier `/var/data/database.sqlite`

Alternativt: Sett opp automatisk backup til en sky-tjeneste.

---

## Feilsøking

### "Failed to fetch" feil
- Sjekk at VITE_API_URL er riktig satt i Vercel
- Sjekk at CORS er konfigurert riktig på backend

### Database feil på Render
- Sjekk at disk er montert på `/var/data`
- Sjekk loggen i Render dashboard

### Serveren er treg
- Gratis tier har cold starts på ~30 sek
- Vurder å oppgradere til betalt plan
