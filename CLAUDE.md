# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## Project Overview

Kalkyle 1.0 - Web-basert kalkulasjonssystem for stålindustri/fabrikasjon. Systemet lar brukere administrere kostpriser og lage tilbud med automatisk prisberegning og PDF-eksport.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Autentisering**: JWT (jsonwebtoken + bcryptjs)
- **PDF**: PDFKit

## Project Structure

```
kalkyle-1.0/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # Gjenbrukbare UI-komponenter
│   │   │   └── Layout.tsx    # Hovedlayout med navigasjon
│   │   ├── pages/            # Sidekomponenter
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── CostPricesPage.tsx    # Administrasjon av kostpriser
│   │   │   ├── QuotesPage.tsx        # Tilbudsoversikt
│   │   │   ├── QuoteEditorPage.tsx   # Tilbudsredigering
│   │   │   └── SettingsPage.tsx      # Innstillinger
│   │   ├── hooks/
│   │   │   └── useAuth.ts    # Autentiseringshook
│   │   ├── services/
│   │   │   └── api.ts        # API-klient
│   │   └── types/
│   │       └── index.ts      # TypeScript-typer
│   └── package.json
├── server/                   # Express backend
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   ├── database.ts       # SQLite oppsett og skjema
│   │   ├── routes/
│   │   │   ├── auth.ts       # Autentisering
│   │   │   ├── categories.ts # Kostnadskategorier
│   │   │   ├── costItems.ts  # Kostnadsposter
│   │   │   ├── quotes.ts     # Tilbud og linjer
│   │   │   ├── settings.ts   # Bedriftsinnstillinger
│   │   │   └── pdf.ts        # PDF-generering
│   │   └── middleware/
│   │       └── auth.ts       # JWT-autentisering
│   └── package.json
└── CLAUDE.md
```

## Build & Run Commands

```bash
# Installer avhengigheter
cd server && npm install
cd ../client && npm install

# Start backend (port 3001)
cd server && npm run dev

# Start frontend (port 5173)
cd client && npm run dev

# Build for produksjon
cd client && npm run build
cd server && npm run build
```

## Development Guidelines

- Bruk norske variabelnavn i UI og brukervendte tekster
- Alle API-ruter starter med `/api/`
- JWT-token sendes i Authorization header: `Bearer <token>`
- Database bruker SQLite med foreign keys aktivert
- Priser lagres som REAL i databasen
- Alle ID-er er UUID v4

## Key Files

- `server/src/database.ts` - Database-skjema og initialisering
- `server/src/routes/quotes.ts` - Tilbudslogikk inkl. linjer og sammendrag
- `server/src/routes/pdf.ts` - PDF-generering for tilbud
- `client/src/services/api.ts` - Alle API-kall
- `client/src/pages/QuoteEditorPage.tsx` - Hovedside for tilbudsredigering
- `client/src/pages/CostPricesPage.tsx` - Administrasjon av kostpriser

## Kostnadskategorier

- `labor` - Arbeidstimer (sveising, montering, engineering)
- `material` - Materialer (stål, profiler, rør)
- `consumable` - Forbruksmateriell (sveiseelektroder, gass, slipeskiver)
- `transport` - Transport og rigg
- `ndt` - NDT-tjenester (RT, UT, MT, PT, VT med sertifiseringsnivåer)

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrer bruker
- `POST /api/auth/login` - Logg inn
- `GET /api/auth/me` - Hent innlogget bruker

### Kostpriser
- `GET /api/categories` - Hent kategorier
- `GET /api/cost-items` - Hent kostnadsposter
- `POST /api/cost-items` - Opprett kostnadspost

### Tilbud
- `GET /api/quotes` - Hent alle tilbud
- `GET /api/quotes/:id` - Hent tilbud med linjer
- `POST /api/quotes` - Opprett tilbud
- `POST /api/quotes/:id/lines` - Legg til linje
- `GET /api/quotes/:id/summary` - Beregn sammendrag

### PDF
- `GET /api/pdf/:id` - Last ned tilbuds-PDF
- `GET /api/pdf/:id?detailed=true` - Last ned detaljert PDF
