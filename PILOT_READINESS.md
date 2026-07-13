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
  un message propose. L'envoi est manuel pour l'instant.
- Parametres: nom et langue du garage, horaires d'ouverture jour par jour,
  services (duree, tampon, actif).
- International NL / EN / FR partout. 41 tests. Quatre controles verts:
  typecheck, lint, tests, build.

## 2. Ce qui est SIMULE ou pas encore connecte (a dire au testeur)

- IA: fournisseur SIMULE (mock deterministe). Les resumes, urgences et brouillons
  sont generes localement, PAS par un vrai modele. Aucune reponse n'est envoyee
  automatiquement. Pour une vraie IA: brancher un fournisseur (cle + budget).
- Canaux WhatsApp / e-mail / telephone: NON connectes. Le formulaire public et le
  fil web fonctionnent. "Envoyer" une reponse enregistre le message, il n'est pas
  livre au client.
- Invitation d'employe: creee en base, mais l'e-mail d'invitation n'est pas
  envoye. L'employe ne peut pas encore accepter via un lien.
- Relances: proposees, mais envoyees a la main (l'envoi automatique attendra
  l'e-mail).
- Devis, factures, paiements, abonnements: pas construits.
- Fuseau horaire: gere en heure locale simple pour le pilote (coherent a l'ecran).

## 3. Securite

- RLS activee sur les 17 tables. Isolation par organisation via une fonction
  securisee (current_user_org_ids). Un utilisateur ne voit que ses garages.
- Fonctions SECURITY DEFINER limitees et intentionnelles: create_organization,
  submit_public_request, public_org_display, org_members, current_user_org_ids,
  current_user_role. Le controle Supabase les signale comme "callable": c'est
  VOULU (elles doivent etre appelables pour creer un garage, recevoir une demande
  publique, afficher le nom public et evaluer les droits). Aucune erreur bloquante.
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

## 7. Limites connues

- IA simulee (pas de vraie generation).
- Pas d'envoi reel (e-mail, WhatsApp, SMS, telephone).
- Fuseau horaire simplifie.
- Pas de devis, factures, paiements.
- Invitation employe sans e-mail d'acceptation.

## 8. Retour arriere (rollback)

- Code: GitHub Desktop, Revert du dernier commit; ou Vercel, Deployments,
  Promote to Production d'un deploiement precedent.
- Base: les migrations sont additives. Restaurer via les sauvegardes Supabase si
  besoin. Ne pas executer de migration destructive pendant le pilote.

## 9. Donnees a NE JAMAIS utiliser pendant le pilote

- Aucune donnee bancaire ou de paiement (non gere).
- Pas de donnees clients sensibles au-dela du necessaire (RGPD) avant revue.
- Ne pas publier de statistiques ou temoignages inventes.
- Ne pas compter sur une reponse automatique de l'IA: elle est simulee, un humain
  valide et envoie.

## 10. Pour aller plus loin (necessite une decision + un budget)

- IA reelle: cle API (Anthropic ou OpenAI) + budget. L'architecture est prete
  (interface AIProvider, selection par variable d'environnement).
- E-mail (recommande en premier, ex. Resend): debloque l'envoi reel des reponses,
  les relances automatiques et les invitations d'employes.
- WhatsApp Business, telephone: comptes + cles + budget.
- Domaine roavaa.com: achat + connexion a Vercel.

Le coeur du produit est complet et testable des maintenant avec le formulaire web
et l'IA simulee. Les integrations reelles s'ajoutent ensuite sans changer
l'architecture.
