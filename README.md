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
Manuell ausführen (Windows/PowerShell im Projektordner):
```bash
./backup.sh
```

(unter Linux/Pi vorher chmod +x backup.sh und dann backup.sh)
Cron (Pi/Linux) z.B. täglich 03:00 Uhr:
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