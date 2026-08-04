# Auto-hébergement (sans Vercel ni le cloud Supabase)

Ce guide s'adresse à un acquéreur qui veut héberger Roavaa sur sa propre
infrastructure plutôt que d'utiliser Vercel + Supabase Cloud. Rien dans le
code n'impose ces deux services — ce sont les choix par défaut du projet
pendant son développement, pas une dépendance en dur.

## 1. Base de données : Supabase auto-hébergé

Supabase est open-source et se déploie via Docker Compose officiel :

```bash
git clone https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker compose up -d
```

Cela fournit Postgres, l'authentification (GoTrue), le stockage de fichiers
et l'API PostgREST — exactement ce que le code de Roavaa appelle via
`@supabase/supabase-js` et `@supabase/ssr`, que ce soit contre une instance
cloud ou auto-hébergée : le SDK ne fait aucune distinction, seule l'URL change.

Ensuite, rejouer les migrations dans l'ordre chronologique
(`supabase/migrations/*.sql`) :

```bash
supabase link --project-ref <ref-du-projet-autohebergé>
supabase db push
```

ou en appliquant chaque fichier directement via `psql` dans l'ordre des noms
(chaque fichier est nommé `<timestamp>_<nom>.sql`).

Voir `supabase/README.md` pour le détail de la politique de migrations.

## 2. Application : Next.js sur un serveur propre (Docker)

Le projet n'utilise aucune API propriétaire Vercel dans le code applicatif
(pas d'Edge Config, pas de KV Vercel, pas d'ISR propriétaire). Un déploiement
Docker standard fonctionne :

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Placer ensuite l'application derrière un reverse proxy (nginx, Caddy,
Traefik) pour le TLS et le nom de domaine. Toutes les variables listées dans
`.env.example` doivent être injectées à l'exécution (fichier `.env`,
secrets Docker, ou variables d'environnement du système d'orchestration).

## 3. Tâches planifiées (remplacer Vercel Cron)

`vercel.json` déclare deux tâches quotidiennes :
- `/api/cron/billing-reminders`
- `/api/cron/process-account-deletions`

Ce sont de simples routes HTTP `GET`, protégées par un jeton porteur
(`Authorization: Bearer <CRON_SECRET>`) — indépendantes de Vercel. N'importe
quel ordonnanceur peut les déclencher, par exemple une entrée `crontab` :

```cron
0 8 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://votre-domaine.tld/api/cron/billing-reminders
0 9 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://votre-domaine.tld/api/cron/process-account-deletions
```

(ou une action planifiée GitHub Actions, ou un job Kubernetes CronJob — le
mécanisme HTTP + jeton porteur est volontairement générique.)

## 4. Services externes (inchangés, quel que soit l'hébergement)

Anthropic (IA), Resend (e-mail) et Stripe (paiement) restent des API
externes appelées par clé, indépendamment de l'endroit où l'application est
hébergée. Aucun de ces trois n'est lié à Vercel ou à Supabase — ce sont des
comptes à créer une fois, chez le fournisseur choisi, quel que soit le choix
d'hébergement.

## 5. Résumé

| Composant | Chemin par défaut (dev) | Chemin auto-hébergé |
|---|---|---|
| Application | Vercel | N'importe quel hôte Docker/Node (VPS, on-prem, cloud privé) |
| Base de données / auth / stockage | Supabase Cloud | Supabase self-hosted (Docker officiel) |
| Tâches planifiées | Vercel Cron | `crontab`, GitHub Actions, CronJob — même route HTTP |
| IA / e-mail / paiement | Anthropic / Resend / Stripe | Identique — ce sont des comptes externes, pas de l'hébergement |

Aucune réécriture de code n'est nécessaire pour changer d'hébergeur.
