# Roavaa · PILOT_READINESS

Guide de mise en pilote et de test. Produit: Roavaa (SaaS multi-tenant pour
garages automobiles). Base de donnees: Supabase (Frankfurt, EU). Front: Next.js
sur Vercel. Langues: NL (defaut), EN, FR.

Note: "Roavaa" est le nom de travail. Faire la verification BOIP/EUIPO avant
toute impression ou lancement public.

---

## 1. Modules disponibles (tous connectes a la vraie base)

- Authentification: inscription, connexion, deconnexion, mot de passe oublie et
  reinitialisation, callback e-mail, sessions, protection des routes.
- Onboarding: creation du garage. Cree automatiquement des horaires par defaut
  (lundi a vendredi 09:00-17:00) et un service par defaut.
- Tableau de bord (cockpit): resume du jour, prospects prioritaires, et 6
  indicateurs reels (nouveaux du jour, ouverts, urgents, rendez-vous a venir,
  taux de conversion, equipe active). Pastille de notifications.
- Formulaire public par garage: cree client + vehicule + demande + conversation
  + premier message + notification. Protege par un piege anti-spam (honeypot).
- Qualification: detection d'urgence deterministe d'abord, puis resume et urgence
  proposes par l'IA. L'humain decide toujours.
- Demande (lead): fiche detaillee, assignation d'un mecanicien, creation d'un
  ordre de reparation, conversation avec brouillon de reponse propose par l'IA
  (l'humain modifie et envoie), proposition de creneaux + reservation.
- Rendez-vous et agenda: moteur de creneaux (ne propose jamais un creneau
  occupe), reservation, vue agenda groupee par jour.
- Clients: liste + recherche, fiche client (coordonnees, vehicules, historique).
- Vehicules: module dedie (liste + recherche, fiche avec edition et historique
  complet: rendez-vous, ordres de reparation, demandes).
- Ordres de reparation: creation depuis une demande, statut, mecanicien, taches.
- Equipe: membres, invitation (statut invite), roles, activation/desactivation.
- Notifications: centre dedie, non lues en premier, marquer comme lu.
- Base de connaissances: pannes frequentes, temps d'intervention, pieces,
  questions frequentes, regles de securite.
- Relances (automatisations): Roavaa calcule quoi faire aujourd'hui (rappels de
  rendez-vous, demandes sans reponse, suivi apres reparation, reactivation) avec
  un message propose. L'envoi est manuel (voir section 2).
- Devis: creation, lignes, TVA, conversion depuis un diagnostic, PDF (3 langues),
  lien public d'acceptation/refus avec preuve horodatee + IP, verrouillage apres
  reponse du client, conversion en ordre de reparation ou facture.
- Factures: numerotation par garage, mentions legales (KvK, TVA), lignes,
  paiement en ligne Stripe, rappels de paiement par e-mail, statuts.
- Stock / pieces: entrees/sorties, alerte stock faible, cout vs prix de vente
  jamais expose au client, protection contre le stock negatif.
- Rapports: chiffre d'affaires reel (pas les devis), export PDF/CSV, filtres
  par periode.
- Vehicules: recherche par plaque (RDW), estimation de valeur indicative.
- Multi-garage, 2FA, journal d'activite, portail client (lien magique), API
  publique + webhooks sortants, carte de visite numerique, signature e-mail
  automatique, mode demonstration (donnees realistes a la creation du compte).
- Parametres: nom et langue du garage, horaires d'ouverture jour par jour,
  services (duree, tampon, actif) — reserve aux roles proprietaire/admin/manager.
- International NL / EN / FR partout. **140 tests unitaires** (21 fichiers)
  + **26 tests e2e Playwright** (2 fichiers). Quatre controles verts:
  typecheck, lint, tests, build.

## 2. Ce qui est SIMULE ou pas encore connecte (a dire au testeur)

- IA: un vrai fournisseur (Anthropic) est actif des que `ANTHROPIC_API_KEY` est
  definie ; sinon, un mock deterministe prend le relais pour le developpement.
  Aucun diagnostic ni devis IA n'est jamais envoye sans validation humaine.
- Canaux WhatsApp / telephone: NON connectes — aucune integration API, seulement
  un lien manuel `wa.me` (l'utilisateur ouvre lui-meme son WhatsApp). L'e-mail
  transactionnel (Resend), lui, est reellement connecte : devis, factures,
  rappels de paiement/devis et invitations d'equipe partent reellement.
- Invitation d'employe: un e-mail reel est envoye ET l'employe qui cree son
  compte avec la meme adresse rejoint automatiquement le bon garage (corrige).
- Relances: propositions uniquement — l'IA ne redige jamais rien qui parte
  seul, un humain envoie toujours.
- Abonnements Stripe: le parcours complet (checkout, activation, renouvellement,
  annulation, webhooks idempotents) est construit et fonctionnel, mais
  desactive commercialement pendant le lancement (`LAUNCH_FREE`).
- Fuseau horaire: vrai calcul IANA par organisation (`organizations.timezone`,
  base sur `Intl`), changement d'heure (DST) gere correctement — teste sur le
  cas reel du 29 mars 2026 (Europe/Amsterdam).

## 3. Securite

- RLS activee sur les 48 tables (aucune exception). Isolation par organisation
  via une fonction securisee (current_user_org_ids), et les ecritures les plus
  sensibles (clients, vehicules, devis, factures, stock, ordres de reparation,
  parametres du garage) sont en plus filtrees par role via role_has().
- Fonctions SECURITY DEFINER limitees et intentionnelles: create_organization,
  submit_public_request, public_org_display, org_members, current_user_org_ids,
  current_user_role, role_has, et les fonctions publiques dediees aux devis/
  factures/portail client. Le controle Supabase les signale comme "callable":
  c'est VOULU pour celles-ci (elles doivent etre appelables pour creer un
  garage, recevoir une demande publique, afficher le nom public et evaluer les
  droits). Aucune erreur bloquante.
- Anti-spam: champ piege (honeypot) sur le formulaire public.
- Ecrans d'erreur et 404 propres et multilingues.

## 4. Mise en ligne (etapes)

1. Pousser le code (GitHub Desktop): decompresser roavaa.zip, copier le CONTENU
   dans Documents\GitHub\ROA, Remplacer, Commit, Push.
2. Vercel, projet ROA, Settings, Environment Variables (Production + Preview +
   Development):
   - NEXT_PUBLIC_SUPABASE_URL = https://qbhtybzwkplmroqfgymn.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (cle publique fournie dans le chat)
   Puis Redeploy.
3. Supabase, Authentication:
   - Recommande pour un test fluide: Providers, Email, desactiver "Confirm email".
   - Sinon: URL Configuration, Site URL = https://roa-sigma.vercel.app et
     Redirect URLs = https://roa-sigma.vercel.app/**

Ne jamais commiter la cle service_role (secrete).

## 5. Compte de test

Aucun compte pre-cree. Creez le votre via /nl/signup. Le premier utilisateur
devient proprietaire de son garage. Utilisez un compte dedie au pilote.

## 6. Parcours de test complet (A vers Z)

Objectif: le testeur doit pouvoir gerer une journee type.

1. Inscription puis onboarding: creer le garage. Arrivee sur le tableau de bord.
2. Parametres: verifier les horaires (lun-ven 09:00-17:00) et le service par
   defaut. Ajouter un service (ex. "Grote beurt", 120 min) si souhaite.
3. Equipe: inviter un mecanicien (un e-mail fictif suffit pour le test).
4. Copier le lien du formulaire (tableau de bord), l'ouvrir en navigation privee.
5. Envoyer une demande normale (ex. "Mijn remmen piepen al een week"). Verifier
   qu'elle apparait au tableau de bord avec un client et un vehicule crees.
6. Test urgence: envoyer "Er komt rook uit de motor". Doit arriver en "Kritiek"
   avec le badge de controle humain, et une notification urgente.
7. Ouvrir la demande: lire le brouillon propose, le modifier, "Versturen".
   Assigner le mecanicien. Proposer un creneau et reserver.
8. Verifier le rendez-vous dans l'Agenda.
9. Creer un ordre de reparation depuis la demande, ajouter des taches, passer le
   statut a "Bezig" puis "Klaar".
10. Fiche client et fiche vehicule: verifier l'historique (demande + rendez-vous
    + ordre de reparation).
11. Relances: ouvrir la page Opvolging, verifier les suggestions, en marquer une
    comme "Gedaan".
12. Base de connaissances: ajouter une panne frequente et une regle de securite.
13. Notifications: ouvrir le centre, marquer comme lu.
14. Changer la langue NL / EN / FR et verifier les traductions.
15. Verifier le rendu sur telephone, tablette et ordinateur.

## 7. Limites reelles actuelles

- WhatsApp / telephone: aucune API connectee, uniquement un lien manuel
  `wa.me` (le garage clique et envoie lui-meme, jamais automatique).
- IA: fournisseur reel (Anthropic) actif seulement si `ANTHROPIC_API_KEY` est
  definie; sinon, mock deterministe pour le developpement. Aucun envoi IA sans
  validation humaine.
- Abonnements Stripe: parcours complet construit et fonctionnel, mais
  desactive commercialement pendant le lancement pilote (`LAUNCH_FREE`).
- Domaine roavaa.com et verification de marque BOIP/EUIPO: a faire avant tout
  lancement public.

## 8. Retour arriere (rollback)

- Code: GitHub Desktop, Revert du dernier commit; ou Vercel, Deployments,
  Promote to Production d'un deploiement precedent.
- Base: les migrations sont additives. Restaurer via les sauvegardes Supabase si
  besoin. Ne pas executer de migration destructive pendant le pilote.

## 9. Donnees a NE JAMAIS utiliser pendant le pilote

- Aucune donnee bancaire ou de paiement (non gere).
- Pas de donnees clients sensibles au-dela du necessaire (RGPD) avant revue.
- Ne pas publier de statistiques ou temoignages inventes.
- Ne pas compter sur une reponse automatique de l'IA sans supervision: un
  humain valide et envoie toujours, meme avec le fournisseur reel actif.

## 10. Pour aller plus loin (necessite une decision + un budget)

- IA reelle: deja implementee et active des que `ANTHROPIC_API_KEY` est
  definie (interface `AIProvider`, selection automatique par variable
  d'environnement, mock deterministe en secours sinon).
- E-mail: deja reellement connecte (Resend) — devis, factures, rappels et
  invitations d'equipe partent reellement.
- WhatsApp Business, telephone: comptes + cles + budget (a la charge de
  l'acquereur). L'UI de connexion existe deja, affichee "Bientot disponible".
- Domaine roavaa.com: achat + connexion a Vercel.

Le coeur du produit est complet et testable des maintenant avec le formulaire
web et l'IA (reelle si la cle est definie, sinon simulee pour le
developpement). Les integrations restantes (WhatsApp Business, telephone)
s'ajoutent ensuite sans changer l'architecture.
