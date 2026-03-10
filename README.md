# Grad Party RSVP Portal

A full-stack RSVP web app built for a graduation party. Guests look up their name, confirm attendance, and provide dietary/plus-one details. The host manages the guest list and views responses through a password-protected admin panel.

## How It Works

Guests visit the site, enter their first and last name, and are matched against the pre-loaded guest list using fuzzy name matching (Levenshtein distance). If found, they proceed through an RSVP form. If not found, they are turned away. The host can log into the admin panel to manage guests, view responses, and export data.

## Architecture

```
GitHub Pages (frontend)  →  Render (backend API)  →  Turso (database)
```

## Local Development

```bash
# Install root dependencies
npm install

# Run frontend and backend together
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.

For local development, create `server/.env` with the variables listed above. The database will fall back to a local SQLite file (`server/data.sqlite`) if `DATABASE_URL` is not set.
