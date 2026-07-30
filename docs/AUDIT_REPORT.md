# ROAVAA — Rapport d'audit complet (acquisition / pilote)

**Date de l'audit :** 2026-07-29
**Portée :** les 24 domaines demandés (documentation, IA, messagerie, devis,
factures/paiements, abonnements Stripe, estimation véhicule, RDW, sécurité
multi-tenant, clés API, portail client, stock, ordres de réparation, agenda,
automatisations, rapports, authentification, RGPD, propriété intellectuelle,
design/UX, i18n, tests, cohérence commerciale.

**Méthode :** audit en lecture seule (8 volets parallèles, code + base de
données Supabase en production), puis corrections des problèmes **critiques**
en premier, vérifiées à chaque étape par `npx tsc --noEmit`, `npm run lint`,
`npx vitest run` et `npm run build`. Chiffres recalculés directement depuis le
code, pas recopiés d'un document précédent.

## Chiffres exacts (recalculés, pas estimés)

**Mise à jour du 2026-07-30** (deuxième audit indépendant, après le lot de
mises à jour de dépendances et de nettoyage de documentation) — chiffres
revérifiés directement via `npx vitest run`, `npx playwright test --list` et
un comptage des fichiers de migration, pas recopiés d'un rapport précédent :

- **140 cas de test Vitest**, répartis sur **21 fichiers**.
- **26 cas de test Playwright e2e**, répartis sur **2 fichiers** (`e2e/auth-guards.spec.ts`, `e2e/public-pages.spec.ts`).
- **77 fichiers de migration** dans `supabase/migrations/*.sql`, **RLS activée
  sur toutes les tables**, sans exception.
- La croissance depuis le premier audit (121 tests/19 fichiers, 66 migrations)
  reflète le travail réalisé entre-temps (module fuseau horaire, export RGPD,
  connexions WhatsApp, etc. — voir le tableau des constats ci-dessous), pas une
  erreur de comptage.
- Aucun de ces chiffres ne correspond à ce que disaient README.md (37),
  PILOT_READINESS.md (41) ou le dossier de cession (82) avant le premier audit
  — les documents ont été recorrigés avec les chiffres ci-dessus (voir section
  Documentation ci-dessous).

---

## Tableau des constats

| Module | Problème constaté | Gravité | Correction appliquée | Test effectué | Résultat | Connecté ? | Travail restant | Fichiers modifiés |
|---|---|---|---|---|---|---|---|---|
| Documentation | README (37 tests), PILOT_READINESS (41), dossier de cession (82) — trois chiffres différents, tous faux ; roadmap indiquait devis/factures/rapports/automatisations/paramètres/abonnements « non construits » alors qu'ils existent ; IA présentée comme « entièrement simulée » alors qu'un vrai fournisseur Anthropic existe ; un deuxième audit indépendant (2026-07-30) a ensuite trouvé les chiffres eux-mêmes à nouveau dépassés (121/19 → 140/21 tests, 66 → 77 migrations) et 5 affirmations obsolètes encore présentes dans PILOT_READINESS.md § Limites | Élevée | Recalcul exact (140 tests Vitest/21 fichiers + 26 e2e/2 fichiers, 77 migrations) ; README, PILOT_READINESS.md, docs/PRODUCT.md, docs/ROADMAP.md, docs/ARCHITECTURE.md réécrits avec l'état réel et les nombres à jour | Lecture croisée code ↔ doc + `npx vitest run` + `npx playwright test --list` + comptage migrations | Corrigé | — | Le dossier de cession (PDF, hors dépôt git) n'a pas été corrigé — à refaire par la fondatrice avec ce rapport comme source | README.md, PILOT_READINESS.md, docs/PRODUCT.md, docs/ROADMAP.md, docs/ARCHITECTURE.md |
| IA — sélection fournisseur | Vérification demandée du choix réel Anthropic vs mock, et absence de repli silencieux | Moyenne (déjà correct) | Aucune — confirmé déjà correct : `AI_PROVIDER ?? (ANTHROPIC_API_KEY ? 'anthropic' : 'mock')` ; une erreur d'appel réel devient un état `error` propagé, jamais un remplacement silencieux par le mock | Lecture de `src/integrations/ai/index.ts` + `anthropic-provider.ts` | Fonctionnel | Oui | — | — |
| IA — visibilité admin | Aucun écran n'indique quel fournisseur IA est actif pour un garage | Moyenne | Non corrigé dans ce lot | — | Constat confirmé | Non | Ajouter un badge dans Réglages (super-admin) affichant provider/modèle actif | — |
| IA — traçabilité (ai_usage_log) | La table enregistre provider/modèle/statut/confiance/latence, mais pas de version de prompt | Faible | Non corrigé dans ce lot | Lecture `src/lib/ai-usage-log.ts` + migration | Constat confirmé | Partiel | Ajouter une colonne `prompt_version` et la renseigner à chaque appel | — |
| IA — fonctions de diagnostic | Vérification demandée que diagnostic photo, résumé, urgence, réponse, devis assisté, analyse véhicule appellent réellement le fournisseur avec validation humaine avant envoi | Élevée (déjà correct) | Aucune — les 9 fonctions IA (diagnostic, résumé véhicule, qualification lead, brouillon de réponse, devis auto, suggestions entretien, rapport de réparation, détection d'oublis, assistant exécutif) appellent réellement `getAIProvider()` ; toutes restent en brouillon/validation humaine avant tout envoi | Lecture des 9 points d'appel | Fonctionnel | Oui | — | — |
| IA — fabrication de prix | Un devis auto-généré pourrait en théorie inventer un prix non nul pour une pièce inconnue côté fournisseur réel (seul le mock a un garde-fou en dur) | Élevée | Non corrigé dans ce lot | Lecture `anthropic-provider.ts` (prompt seul, pas de vérification code) | Constat confirmé | Partiel | Ajouter une vérification côté code après réponse du modèle (comme le mock le fait déjà) | — |
| Messagerie — devis | Envoi d'un devis au client | — | — | Test manuel du flux `updateQuoteStatusAction` | **Livraison réelle confirmée** (Resend) | Oui | — | — |
| Messagerie — factures | Le statut « envoyée » ne déclenche **aucun** envoi réel (seul le rappel de paiement envoie un vrai e-mail) | Élevée | Non corrigé dans ce lot (périmètre différent du bug « payée sans preuve » qui, lui, a été corrigé — voir Factures) | Lecture `updateInvoiceStatusAction` | Confirmé : enregistrement en base seulement | Non pour ce statut précis | Brancher un envoi réel sur la transition « envoyée », ou renommer l'action pour ne pas laisser croire à un envoi | — |
| Messagerie — rapport de réparation client | Le message rédigé par l'IA (`work_order_reports.client_message_*`) n'est jamais envoyé, seulement affiché | Moyenne | Non corrigé dans ce lot | Lecture `generateRepairReportAction` + page détail | Confirmé : jamais envoyé | Non | Ajouter un bouton d'envoi réel (Resend) | — |
| Messagerie — automatisations client | Rappels de RDV, relances sans réponse, suivi après réparation, réactivation : ce sont des **suggestions**, jamais un envoi automatique — conforme à la conception documentée, mais à clarifier dans l'UI | Faible (comportement voulu) | Aucune | Lecture `src/data/automations/engine.ts` | Conforme à l'intention (« l'envoi est toujours une décision humaine ») | Suggestion uniquement (voulu) | Étiqueter plus clairement « suggestion » vs « envoyé » dans l'écran des automatisations | — |
| Messagerie — WhatsApp/SMS/téléphone | Aucune intégration API ; seul un lien manuel `wa.me` existe ; la copie marketing (page publique + `robinIntro` inutilisé) laissait croire à une prise en charge automatique | Élevée | Copie corrigée (voir ci-dessous). Architecture multi-garage ajoutée : table `whatsapp_connections` (une ligne par organisation, RLS), section « WhatsApp Business » dans Paramètres montrant l'état par garage, bouton de connexion volontairement désactivé (« Bientôt disponible »). Chaque garage connectera plus tard son propre numéro professionnel — jamais un numéro personnel, jamais partagé entre garages. Aucune fonction d'envoi n'existe encore nulle part dans le code : impossible de faire croire qu'un message WhatsApp a été envoyé | `npx tsc/vitest/build` | Corrigé (copie + architecture réelle) ; l'envoi réel reste bloqué en attendant un compte fournisseur professionnel (Meta ou un intermédiaire type Twilio/360dialog/Gupshup) — décision commerciale et documents d'entreprise requis, hors de portée du code | Non (assumé, affiché clairement comme « bientôt disponible », jamais simulé) | Choisir un fournisseur (direct Meta ou intermédiaire), passer la vérification d'entreprise Meta, puis brancher l'envoi réel une fois les identifiants obtenus | supabase/migrations/20260730130000_whatsapp_connections.sql, src/app/[locale]/(app)/settings/page.tsx, messages/{nl,en,fr}.json, src/components/landing/content.ts |
| Messagerie — invitations employé | **Bug critique** : un e-mail réel était envoyé, mais rien ne rattachait l'invité à l'organisation invitante à son inscription — il créait son propre garage | **Critique** | `handle_new_user()` récupère désormais toute invitation en attente correspondant à l'e-mail du nouveau compte, de façon atomique, sans changement côté application | `npx tsc/vitest/build` + relecture du trigger | **Corrigé** | Oui | Cas d'un utilisateur déjà existant invité dans un 2e garage : le lien pointe vers `/signup`, qui échouera pour un compte déjà créé — à traiter séparément | supabase/migrations/20260729200000_claim_pending_invitations_on_signup.sql |
| Devis — numérotation, lignes, TVA, conversion, PDF | Vérification complète | — | Aucune, déjà fonctionnel | Lecture complète du module | Fonctionnel | Oui | — | — |
| Devis — archivage | Aucune fonction d'archivage/suppression logique n'existe | Moyenne | Non corrigé dans ce lot | Lecture `src/data/quotes/actions.ts` | Constat confirmé | Non | Ajouter `archived_at` + action dédiée | — |
| Devis — preuve d'acceptation | Le lien public d'acceptation/refus n'enregistrait qu'`updated_at` générique — aucune IP, user-agent ou horodatage dédié | Élevée | Colonnes `responded_at`/`responded_ip`/`responded_user_agent` ajoutées ; `public_quote_respond` les renseigne désormais à chaque réponse | Application de la migration + `get_advisors` | **Corrigé** | Oui | — | supabase/migrations/20260729202000_quote_response_audit_trail.sql, src/data/quotes/public-actions.ts |
| Devis — modification après acceptation | Un devis accepté restait modifiable (lignes, TVA) sans trace ni verrouillage | **Critique** | Lignes/TVA verrouillées dès que le statut quitte `draft`/`sent` ; UI adaptée (affichage lecture seule) ; changements manuels de statut désormais journalisés dans `activity_log` | `npx tsc/vitest/build` | **Corrigé** | Oui | — | src/data/quotes/actions.ts, src/app/[locale]/(app)/quotes/[id]/page.tsx, src/data/activity/log.ts, supabase/migrations/20260729203000_activity_log_add_quote_entity.sql |
| Factures — mentions légales, calculs, PDF | Vérification complète | — | Aucune, déjà fonctionnel | Lecture complète | Fonctionnel | Oui | — | — |
| Factures — marquage « payée » sans preuve | Le menu déroulant générique permettait de passer une facture à « payée »/« partiellement payée » sans aucun paiement enregistré | **Critique** | Ce menu ne permet plus que draft/à préparer/envoyée/en retard/annulée ; « payée » n'est atteignable que via les actions qui enregistrent réellement un paiement | `npx tsc/vitest/build` | **Corrigé** | Oui | — | src/data/invoices/actions.ts, src/app/[locale]/(app)/invoices/[id]/page.tsx |
| Factures — suppression définitive | Vérifié : aucune suppression définitive d'une facture émise n'existe dans le code (RLS le bloque aussi) | — | Aucune nécessaire | Lecture RLS + actions | Sûr | Oui | — | — |
| Abonnements Stripe — webhook, double traitement | Un événement Stripe redélivré (cas documenté par Stripe lui-même) pouvait créditer deux fois un paiement de facture | **Critique** | Table `processed_stripe_events` ajoutée, réclamée avant tout effet de bord ; un événement déjà traité est acquitté sans être rejoué | Application migration + relecture du webhook | **Corrigé** | Oui | — | supabase/migrations/20260729201000_processed_stripe_events.sql, src/app/api/webhooks/stripe/route.ts |
| Abonnements Stripe — reste | Checkout, activation, renouvellement, annulation, synchronisation Supabase : vérifiés fonctionnels ; facturation désactivée commercialement (`LAUNCH_FREE`) | — | Aucune | Lecture complète | Fonctionnel, gating commercial volontaire | Oui | `plan_key` écrit avant confirmation du paiement (mineur) — à corriger si l'activation commerciale est levée | — |
| Estimation valeur véhicule | Fourchette + sources + hypothèses déjà affichées ; jamais de valeur inventée ; transmission absente du calcul ; aucune date de calcul affichée | Moyenne | Non corrigé dans ce lot | Lecture `src/lib/valuation/engine.ts` + UI | Fonctionnel avec 2 lacunes mineures | Oui | Ajouter le champ transmission + une date de calcul affichée | — |
| RDW — recherche plaque | Normalisation, plaque étrangère/invalide, cache 24h : vérifiés ; **aucun anti-abus** sur la route publique (le code l'admet lui-même en commentaire) ; pas de date de consultation affichée | Moyenne | Non corrigé dans ce lot | Lecture `src/integrations/rdw/client.ts` + routes | Fonctionnel avec lacune anti-abus | Oui | Ajouter un rate limiting sur `/api/rdw/public-lookup` (le mécanisme `checkRateLimit` existe déjà, il suffit de le brancher) | — |
| Sécurité RLS — ensemble des tables | Audit des 48 tables : RLS activée partout, aucune politique permissive trouvée sur l'échantillon sensible (clients, factures, paiements, devis, ordres de réparation, adhésions, clés API) | — | Aucune nécessaire | Requêtes SQL directes sur `pg_policies` | Sain | Oui | — | — |
| Sécurité RLS — RBAC par rôle | **Découverte majeure** : un contrôle par rôle (`role_has()` + politiques `manage_operations`/`manage_financial`/`manage_inventory`/`manage_work_orders`/`manage_knowledge`/`manage_settings`) existait déjà en production sur 15 tables, mais sa migration n'avait jamais été committée dans git — dérive identique à l'incident `error_log` déjà connu | Élevée (dérive documentaire, pas faille) | Migration de rattachement écrite et rejouée (idempotente) pour que git corresponde enfin à la production | Rejeu de la migration en base (aucune erreur = transcription exacte confirmée) | **Corrigé (dérive documentaire résolue)** | Oui | Mettre en place une vérification automatique périodique migrations-git vs schéma live | supabase/migrations/20260729204000_rbac_role_has_backfill.sql |
| Sécurité — fonctions SECURITY DEFINER | 26 fonctions avec `search_path` explicite (aucune manquante) ; `next_quote_number` était la seule sans `revoke` explicite (incohérence mineure face à `next_invoice_number`) | Faible | Revoke ajouté pour `next_quote_number` | Application migration | **Corrigé** | Oui | — | supabase/migrations/20260729205000_next_quote_number_revoke_public.sql |
| Sécurité — buckets Storage | Buckets privés correctement cloisonnés par organisation ; `org-logos` public par conception ; un ancien trou d'exposition déjà corrigé dans une migration antérieure | — | Aucune nécessaire | Lecture des politiques de storage | Sain | Oui | — | — |
| Sécurité — clé service_role | Confirmée jamais utilisée côté client, toujours dans un module `server-only` | — | Aucune nécessaire | Recherche exhaustive dans `src/` | Sain | Oui | — | — |
| Sécurité — routes API publiques | Les 5 routes `/api/v1/*` filtrent bien par `organization_id` de la clé API, pas seulement sa validité | — | Aucune nécessaire | Lecture des 5 routes | Sain | Oui | — | — |
| Clés API / webhooks développeur | Stockage haché, affichage une seule fois, révocation, rotation, rate limiting déjà en place (audité dans un lot précédent de ce projet) | — | Aucune nécessaire pour ce lot | — | Fonctionnel | Oui | — | — |
| Portail client | Authentification par lien magique confirmée isolée par e-mail vérifié ; aucune fuite de notes internes/coûts/marges vers le client ; déconnexion fonctionnelle | — | Aucune nécessaire | Lecture des RPC + select clauses | Sain | Oui | — | — |
| Stock et pièces | `created_by` renseigné mais colonne non contrainte NOT NULL ; raison de mouvement bien contrainte en base ; coût jamais exposé au client — **stock négatif possible sans avertissement** | **Critique** (le stock négatif) | Garde-fou ajouté : un usage qui dépasserait le stock disponible est refusé avec un message clair | `npx tsc/vitest/build` | **Corrigé** | Oui | Rendre `created_by` NOT NULL (mineur) | src/data/inventory/actions.ts, messages/{nl,en,fr}.json |
| Ordres de réparation — historique de statut | Une ligne d'historique est bien créée à chaque changement | — | Aucune nécessaire | Lecture `updateWorkOrderStatusAction` | Sain | Oui | — | — |
| Ordres de réparation — checklist avant clôture | Un ordre pouvait passer « livré » avec des points de checklist encore en attente, sans aucune alerte | **Critique** | Un ordre ne peut plus passer « livré » avec des points en attente, sauf case de dérogation explicite cochée par le personnel | `npx tsc/vitest/build` | **Corrigé** | Oui | — | src/data/work-orders/actions.ts, src/app/[locale]/(app)/work-orders/[id]/page.tsx, messages/{nl,en,fr}.json |
| Agenda et fuseaux horaires | La table `time_off` existait en base mais n'était jamais consultée par le moteur de disponibilité — un congé/absence posé ne bloquait aucun créneau suggéré. Les heures étaient stockées en « heure murale naïve étiquetée UTC » (`new Date(\`${day}T${time}:00.000Z\`)`) : aucun vrai calcul de fuseau IANA, aucune gestion du changement d'heure (DST), et les bornes « aujourd'hui » de plusieurs écrans (tableau de bord, Ruben, agenda, équipe) étaient calculées en UTC pur, ce qui pouvait faire apparaître/disparaître des rendez-vous à la mauvaise date près de minuit local | Moyenne | `time_off` branché dans le moteur de créneaux. Nouveau module `src/lib/timezone.ts` (basé sur `Intl`, sans dépendance externe) qui convertit correctement heure locale ⇄ UTC réel en tenant compte du fuseau IANA réel de l'organisation (`organizations.timezone`) et du changement d'heure. Branché sur : création manuelle de rendez-vous, moteur de suggestion de créneaux, bornes « aujourd'hui » du tableau de bord/Ruben/agenda/équipe, et affichage des heures de rendez-vous (agenda, fiche client, fiche lead, portail client) | `npx tsc/vitest/build` — 12 nouveaux tests dont un cas réel de changement d'heure (29 mars 2026, Europe/Amsterdam) | **Corrigé** | Oui | — | src/lib/timezone.ts, src/data/appointments/{actions,propose}.ts, src/app/[locale]/(app)/{agenda,dashboard,team,leads/[id],customers/[id]}/page.tsx, src/app/[locale]/portal/page.tsx, src/data/robin/load.ts, src/data/settings/actions.ts, src/app/[locale]/(app)/settings/page.tsx, supabase/migrations/20260730140000_portal_org_info_add_timezone.sql |
| Automatisations et relances | Confirmé : jamais d'envoi automatique, dédoublonnage réel, mais pas de gestion de consentement/désinscription dans ce module (les champs existent ailleurs, pas utilisés ici) | Faible (conception assumée) | Non corrigé dans ce lot | Lecture `engine.ts` | Conforme à l'intention | Suggestion uniquement (voulu) | Ajouter une vérification de consentement si l'envoi automatique est un jour activé | — |
| Rapports et statistiques | Confirmé : chiffres réels, chiffre d'affaires basé sur les paiements encaissés (pas les devis), filtres de période et exports PDF/CSV fonctionnels | — | Aucune nécessaire | Lecture `load.ts` + `summarize.ts` | Sain | Oui | — | — |
| Authentification et autorisations | Rate limiting réellement branché sur connexion/lien magique/réinitialisation ; sessions et routes protégées vérifiées ; **aucune réauthentification** pour la révocation de clé API ou la désactivation 2FA (2FA bénéficie implicitement d'un niveau AAL2 Supabase, la révocation de clé API non) | Moyenne | La révocation de clé API exige désormais la ré-saisie du mot de passe du compte, vérifiée côté serveur (`signInWithPassword`) avant que la clé soit effectivement révoquée | `npx tsc/vitest/build` | **Corrigé** | Oui | — | src/data/developer/actions.ts, src/app/[locale]/(app)/settings/page.tsx, messages/{nl,en,fr}.json |
| RGPD | Pas d'export/suppression en libre-service (traité par contact e-mail) ; Resend absent de la liste des sous-traitants de la politique de confidentialité ; données envoyées à l'IA déjà minimisées (aucun nom/téléphone/e-mail dans les prompts de diagnostic) | Moyenne | Resend ajouté à la liste des sous-traitants (3 langues). Export libre-service (JSON, profil + adhésions + journal d'activité personnel) via `/[locale]/account/export`. Suppression libre-service : quitte immédiatement chaque organisation dont l'utilisateur est simple membre (nouvelle fonction `leave_organization`), puis enregistre une demande d'effacement du compte. Si l'utilisateur possède encore une organisation, la demande est honnêtement marquée « bloquée » (la base refuse de toute façon la suppression tant qu'une organisation lui appartient — `on delete restrict`) ; sinon un job planifié (`api/cron/process-account-deletions`, rôle de service uniquement) supprime réellement le compte `auth.users` | `npx tsc/vitest/build` | **Corrigé** | Oui | — | supabase/migrations/20260730100000_account_deletion_self_service.sql, src/data/account/actions.ts, src/app/[locale]/(app)/account/export/route.ts, src/app/api/cron/process-account-deletions/route.ts, src/app/[locale]/(app)/settings/page.tsx, vercel.json, messages/{nl,en,fr}.json |
| Propriété intellectuelle | « ROAVAA » toujours nom de travail (vérification BOIP/EUIPO non faite) ; licences des dépendances directes vérifiées permissives (MIT/ISC/Apache-2.0) ; aucun secret ni compte personnel codé en dur trouvé | — | Aucune nécessaire pour ce lot | Recherche exhaustive + scan licences | Sain, dépôt de marque à faire par la fondatrice | N/A | Déposer la marque avant impression/lancement public si souhaité | — |
| Design et UX | Non ré-audité dans ce lot (portée déjà couverte lors de lots précédents de ce projet — responsive, états de chargement, mode démo) | — | — | — | — | — | Revue visuelle écran par écran non refaite dans cet audit | — |
| Internationalisation | Parité de clés nl/en/fr confirmée par le test automatique existant (`src/i18n/messages.test.ts`, 3/3 verts) ; aucune chaîne codée en dur trouvée hors `global-error.tsx` (hors arbre i18n par nature) | — | Aucune nécessaire | `npx vitest run src/i18n/messages.test.ts` | Sain | Oui | — | — |
| Tests et qualité | Chiffres recalculés (voir en tête de rapport) ; CI GitHub Actions déjà en place | — | Voir section Documentation | `npm run typecheck && npm run lint && npm test && npm run build` | Tous verts | Oui | Ajouter des tests dédiés : isolation multi-tenant, webhook idempotence, panne fournisseur IA | — |
| Cohérence commerciale | La page publique simulait une conversation WhatsApp automatisée et une notification automatique « voiture prête » qui n'existent pas | Élevée | Copie corrigée dans les 3 langues (voir Messagerie — WhatsApp ci-dessus) | `npx vitest run` (parité i18n) | **Corrigé** | Oui | Revue plus large landing vs fonctionnalités réelles recommandée avant tout lancement payant | src/components/landing/content.ts |

---

## Classification générale

Une catégorie n'est cochée que si **toutes** ses conditions sont réellement
remplies.

- ✅ **PRÊT POUR DÉMONSTRATION** — mode démo fonctionnel, aucun crash connu,
  parcours complet visible en 3 langues.
- ✅ **PRÊT POUR GARAGE PILOTE** — les bugs critiques qui auraient cassé un
  pilote réel (invitation d'employé, facture marquée payée sans preuve,
  double crédit Stripe, devis accepté modifiable, ordre livré sans checklist,
  stock négatif) sont **désormais corrigés**, de même que la réauthentification
  clé API, le branchement de `time_off` dans le moteur de créneaux et le
  calcul de fuseau horaire (désormais un vrai calcul IANA, avec changement
  d'heure géré correctement — plus plausible pour un pilote NL/BE/FR).
- ❌ **PRÊT POUR CLIENTS PAYANTS** — la facturation Stripe est désactivée
  commercialement par choix (`LAUNCH_FREE`), WhatsApp/téléphone ne sont pas
  connectés alors qu'ils font partie de la promesse commerciale du marché
  cible. À lever avant tout encaissement réel.
- ❌ **PRÊT POUR AUDIT D'ACQUISITION** — la documentation contredisait le code
  sur des points vérifiables (nombre de tests, fonctionnalités « non
  construites ») ; c'est maintenant corrigé dans le dépôt (chiffres 2026-07-30 :
  140 tests Vitest/21 fichiers, 26 e2e Playwright/2 fichiers, 77 migrations —
  `npm audit` à **0 vulnérabilité**, toute sévérité confondue), mais le
  **dossier de cession externe** (PDF) contient les mêmes erreurs et n'a pas
  été corrigé dans cet audit (il est hors du dépôt git) — à refaire avec ce
  rapport comme source avant toute présentation à un acquéreur.

## Travail restant priorisé (au-delà de ce lot)

Corrigés depuis la première version de cet audit : envoi réel sur facture
« envoyée » et sur le message client de fin de réparation ; garde-fou code
contre un prix IA fabriqué (`enforceCatalogPricing`) ; rate limiting sur
`/api/rdw/public-lookup` ; réauthentification avant révocation de clé API ;
`time_off` branché dans le moteur de créneaux ; export/suppression RGPD en
libre-service ; indicateur admin du fournisseur IA actif + `prompt_version`
dans `ai_usage_log` (page `/admin/ai-usage`, lien depuis Paramètres pour le
propriétaire de la plateforme) ; archivage/désarchivage des devis
(réversible, colonne `archived_at`, filtre dédié dans la liste) ; vrai calcul
de fuseau horaire IANA (module `src/lib/timezone.ts`, changement d'heure géré
correctement, testé) branché sur la création de rendez-vous, le moteur de
créneaux, les compteurs « aujourd'hui » et l'affichage des heures partout où
un rendez-vous est montré (agenda, tableau de bord, équipe, fiche client,
fiche lead, portail client) ; écran Paramètres > Entreprise pour changer le
fuseau horaire de l'organisation (liste de fuseaux courants, validation
serveur contre tout fuseau IANA réel).

Reste à faire :

1. Faible : `created_by` NOT NULL sur les mouvements de stock (non fait —
   entrerait en conflit avec les données de démonstration qui ne renseignent
   pas ce champ pour les réappros système).
