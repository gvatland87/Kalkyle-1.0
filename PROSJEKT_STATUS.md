# Kalkyle 1.0 - Prosjektstatus

**Dato:** 6. februar 2026

## Utført arbeid i dag

### 1. Lagt til standard kostpriser (seed data)
Lagt til automatisk seeding av 60+ standard kostpriser for stålindustrien:

**Arbeid (11 poster):**
- Sveisere (TIG, MIG/MAG, MMA)
- Platearbeider, Rørlegger, Montør
- Prosjektleder, Ingeniør, Tegner/CAD
- Kranfører, Lærling

**Materialer (20 poster):**
- Stålplater S355 (5-20mm)
- Rustfritt stål 316L
- Bjelker (HEA, HEB, IPE)
- Rør i S355 og 316L
- Flattstål, Vinkelstål, U-profil

**Forbruksmateriell (14 poster):**
- Sveiseelektroder og tråd
- Gass (Argon, CO2/Argon)
- Slipe-/kutteskiver
- Maling og primer

**Transport (9 poster):**
- Kjøretøy (varebil, lastebil, spesialtransport)
- Rigg/avrigg
- Kran og lift
- Stillasleie

**NDT (8 poster):**
- VT, PT, MT, UT, RT
- PMI, Hardhetsmåling
- Sveisesertifikat

---

## Tidligere arbeid (4. februar)

### 1. Migrering fra SQLite til MongoDB
- Byttet fra `better-sqlite3` til `mongoose`
- Opprettet MongoDB Atlas cluster: `Kalkyle`
- Database-bruker: `Kalkyleuser`
- Alle routes omskrevet til MongoDB (auth, categories, costItems, calculations)
- Connection string konfigurert i Render

### 2. Forbedret hurtigkalkulator
- Lagt til dropdown for å velge kostpriser fra databasen
- Kostpriser grupperes etter kategori (Arbeid, Materialer, Forbruksmateriell, Transport, NDT)
- Enhetspris og enhet fylles ut automatisk ved valg
- Manuell inntasting fortsatt mulig

## Deployment Status

### Backend (Render)
- **URL:** https://kalkyle-1-0-1.onrender.com
- **Status:** ✅ Live
- **Database:** MongoDB Atlas (Kalkyle cluster)

### Frontend (Vercel)
- Deployes automatisk fra GitHub
- Henter data fra Render backend

## Miljøvariabler i Render

| Key | Value |
|-----|-------|
| MONGODB_URI | mongodb+srv://Kalkyleuser:***@kalkyle.5f2o7om.mongodb.net/kalkyle?retryWrites=true&w=majority |
| JWT_SECRET | (satt) |
| FRONTEND_URL | (satt) |
| NODE_ENV | production |

## MongoDB Atlas

- **Cluster:** Kalkyle
- **Region:** AWS / Stockholm (eu-north-1)
- **Database-bruker:** Kalkyleuser
- **Network Access:** 0.0.0.0/0 (alle IP-er tillatt)

## Neste steg / TODO

1. ~~Test at brukere lagres permanent etter registrering~~ ✅ (MongoDB Atlas er persistent)
2. ~~Legg til flere kostpriser i systemet~~ ✅ (60+ standard kostpriser lagt til)
3. Vurder å legge til eksport-funksjon (CSV/Excel)
4. Vurder å legge til historikk for kalkyler
5. Mobilvisning kan forbedres

## Git commits i dag

```
4543ad8 - Add cost price dropdown to quick calculator
d74db0f - Fix: Wait for MongoDB connection before starting server
24c32e5 - Migrate from SQLite to MongoDB for persistent storage
```

## Filstruktur (viktige filer)

```
server/
├── src/
│   ├── database.ts      # MongoDB-tilkobling og schemas
│   ├── index.ts         # Express server setup
│   └── routes/
│       ├── auth.ts      # Autentisering (register/login)
│       ├── categories.ts # Kostnadskategorier
│       ├── costItems.ts  # Kostpriser (globale)
│       └── calculations.ts # Kalkyler og linjer

client/
├── src/
│   ├── components/
│   │   └── Layout.tsx   # Hovedlayout med hurtigkalkulator
│   └── pages/
│       ├── CostPricesPage.tsx    # Administrer kostpriser
│       └── CalculationPage.tsx   # Opprett/rediger kalkyler
```
