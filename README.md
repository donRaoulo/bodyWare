This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## docer container start/build
achtung db und web container werden gelöscht
```bash
docker compose up --build -d
```
Nur den webcontainer neu bauen
```bash
 docker compose up --build --no-deps web
 ```

 container stopen
 ```bash
 docker compose stop
```

## backup 
Manuell ausfuehren (Windows/PowerShell im Projektordner):
```bash
./backup.sh
```

Das Script erstellt automatisch ein lokales SQL-Backup und laedt es zusaetzlich nach Google Drive hoch.
Voraussetzung: Auf dem Raspberry Pi oder Linux-System ist `rclone` installiert und das Remote `gdrive:bodyware-backups` wurde einmal mit `rclone config` eingerichtet.

Optionale Limits:
```bash
export BACKUP_KEEP_LOCAL=20
export BACKUP_KEEP_REMOTE=20
```

Cron (Pi/Linux) z.B. taeglich 03:00 Uhr:
```bash
crontab -e
0 3 * * * /bin/bash /home/pi/FitFlex_compyle/backup.sh >> /home/pi/FitFlex_compyle/backups/backup.log 2>&1
```
## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.


