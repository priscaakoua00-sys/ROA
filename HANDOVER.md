# Roavaa — Dossier de remise (acquéreur)

Ce document est le point d'entrée pour toute personne qui reçoit ce code en
vue d'une acquisition ou d'une reprise. Il répond à trois questions : qu'est-ce
qui est livré, qu'est-ce qu'il faut créer soi-même pour faire tourner
l'application, et par où commencer.

## 1. Ce qui est livré dans ce zip

- Le code source complet de l'application (Next.js / TypeScript), tel qu'il
  tourne aujourd'hui — rien de retiré, rien de masqué.
- L'historique complet des migrations de base de données
  (`supabase/migrations/`, 79 fichiers), rejouable de zéro sur n'importe quelle
  base Postgres/Supabase.
- La suite de tests (146 tests unitaires Vitest + 26 tests end-to-end
  Playwright) et la configuration CI (GitHub Actions).
- Toute la documentation produit et technique : `README.md`,
  `PILOT_READINESS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`,
  `docs/PRODUCT.md`, `docs/ROADMAP.md`, et surtout
  **`docs/AUDIT_REPORT.md`** — un audit ligne par ligne, daté, de ce qui est
  réellement connecté vs simulé vs encore à faire. À lire avant toute
  négociation : il documente aussi bien les points forts que les limites
  réelles, sans enjolivement.
- Ce document (`HANDOVER.md`) et le guide d'auto-hébergement
  (`docs/SELF_HOSTING.md`).

Aucun secret, clé API ou identifiant n'est présent dans ce zip. Voir
`.env.example` pour la liste complète des variables d'environnement
nécessaires — c'est un template, pas des valeurs réelles.

## 2. Ce qui N'EST PAS livré (et doit être créé par l'acquéreur)

Comme pour n'importe quel SaaS réel, l'application dépend de comptes de
service externes que le code appelle mais ne fournit pas :

| Service | Rôle | Obligatoire pour démarrer ? |
|---|---|---|
| Hébergement (Vercel **ou** serveur/Docker propre) | Fait tourner l'application | Oui |
| Supabase (cloud **ou** auto-hébergé) | Base de données, authentification, stockage | Oui |
| Anthropic (clé API) | IA réelle (qualification, brouillons, diagnostics) | Non — un mode `mock` déterministe fonctionne sans clé, pour développer/tester |
| Resend | Envoi d'e-mails réels (devis, factures, invitations) | Non — l'app fonctionne sans, mais aucun e-mail ne part |
| Stripe | Paiement en ligne des factures + abonnements (iDEAL inclus, à activer côté tableau de bord Stripe) | Non — désactivé par défaut (`LAUNCH_FREE`) |
| Meta Business Manager (par garage) | Envoi WhatsApp réel depuis le numéro professionnel du garage | Non — tant qu'aucun garage ne connecte son compte, le lien manuel `wa.me` reste disponible |
| Nom de domaine | URL publique propre | Non — fonctionne sur l'URL d'hébergement par défaut |

Aucun de ces comptes n'est inclus dans la vente : c'est la même situation
que pour tout logiciel SaaS cédé sans son exploitation commerciale en cours.

Deux points à traiter séparément, avant tout lancement public sous ce nom :
- **"Roavaa" est un nom de travail**, la vérification de disponibilité de
  marque (BOIP/EUIPO) n'a pas été faite.
- Le nom de domaine `roavaa.com` n'est ni acheté ni connecté.

## 3. État réel du produit

Voir `docs/AUDIT_REPORT.md` (section "Classification générale") pour le détail,
résumé ici :

- ✅ Prêt pour démonstration (mode démo fonctionnel, 3 langues, aucun crash connu).
- ✅ Prêt pour un garage pilote réel (les bugs critiques identifiés lors de
  l'audit — facturation, stock, checklists, fuseaux horaires — sont corrigés).
- ❌ Pas encore prêt pour de la facturation commerciale réelle : Stripe est
  câblé de bout en bout mais désactivé par choix (`LAUNCH_FREE`).
- ❌ Pas encore prêt pour un audit d'acquisition formel sans mise à jour
  préalable du dossier de cession externe (hors dépôt git) — voir
  `docs/AUDIT_REPORT.md` pour les chiffres exacts et vérifiés à citer.

## 4. Par où commencer (acquéreur technique)

1. Lire `README.md` puis `PILOT_READINESS.md`.
2. Lire `docs/AUDIT_REPORT.md` en entier — c'est le document le plus honnête
   sur l'état réel du code.
3. Choisir un mode de déploiement :
   - Rapide (Vercel + Supabase cloud) : suivre `PILOT_READINESS.md`.
   - Auto-hébergé (serveur / Docker propres, sans dépendre de Vercel ni du
     cloud Supabase) : suivre `docs/SELF_HOSTING.md`.
4. Copier `.env.example` vers `.env.local`, renseigner les valeurs.
5. `npm install && npm run typecheck && npm run lint && npm test && npm run build`
   — les quatre doivent passer au vert avant toute mise en production.

## 5. Licences

Toutes les dépendances directes ont des licences permissives (MIT/ISC/
Apache-2.0), vérifié lors de l'audit du 2026-07-29 — voir
`docs/AUDIT_REPORT.md`, section "Propriété intellectuelle".
