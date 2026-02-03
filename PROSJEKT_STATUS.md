# Kalkyle 1.0 - Prosjektstatus

**Dato:** 4. februar 2026

## Utført arbeid i dag

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

1. Test at brukere lagres permanent etter registrering
2. Legg til flere kostpriser i systemet
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
