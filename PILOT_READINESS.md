# Roavaa · PILOT_READINESS

Document de mise en pilote. Produit: Roavaa (SaaS multi-tenant pour garages
automobiles). Base de donnees: Supabase (region Frankfurt, EU). Front: Next.js
(App Router) sur Vercel. Langues: NL (defaut), EN, FR.

Note: "Roavaa" est le nom de travail. Faire la verification BOIP/EUIPO avant
toute impression ou lancement public.

---

## 1. Ce qui fonctionne reellement (connecte a la vraie base)

- Authentification: inscription, connexion, deconnexion, mot de passe oublie,
  reinitialisation, callback e-mail, sessions Supabase, protection des routes
  (middleware), redirections selon l'etat de l'utilisateur.
- Onboarding: creation du garage (nom, type, langue). A la creation, le systeme
  ajoute automatiquement des horaires par defaut (lundi a vendredi, 09:00-17:00)
  et un service par defaut, pour que la prise de rendez-vous marche tout de suite.
- Multi-tenant: 15 tables, RLS (Row Level Security) activee sur TOUTES. Chaque
  garage ne voit que ses propres donnees.
- Formulaire public /[langue]/request/[slug]: cree client + vehicule + demande
  + conversation + premier message + notification, en une operation securisee.
- Qualification: detection d'urgence DETERMINISTE d'abord (fumee, freins HS,
  odeur de carburant, etc.) qui force "critique" + controle humain, puis resume
  et urgence proposes par l'IA. L'humain decide toujours.
- Tableau de bord: chiffres reels (nouveaux aujourd'hui, demandes ouvertes,
  urgents, rendez-vous a venir), demandes cliquables, pastille de notifications.
- Demande (lead): fiche detaillee, assignation d'un mecanicien, creation d'un
  ordre de reparation, conversation avec brouillon de reponse propose par l'IA
  (l'humain modifie et envoie), proposition de creneaux libres + reservation.
- Agenda: rendez-vous a venir, groupes par jour, avec statut.
- Clients: liste + recherche (nom, telephone, e-mail). Fiche client: coordonnees,
  vehicules (avec ajout), et historique complet (demandes + rendez-vous).
- Equipe: liste des membres, invitation (statut "invite"), changement de role,
  activation / desactivation.
- Ordres de reparation: creation depuis une demande, statut, mecanicien assigne,
  liste de taches cochables.
- Internationalisation NL / EN / FR sur toutes les pages.
- 37 tests automatiques verts (validation, IA simulee, urgences, creneaux,
  brouillons). Les 4 controles passent: typecheck, lint, tests, build.

## 2. Ce qui est SIMULE ou pas encore connecte (a dire au garagiste)

- IA: le fournisseur est SIMULE (MockAIProvider). Les resumes, urgences et
  brouillons sont generes localement, PAS par un vrai modele. Aucune reponse
  n'est envoyee automatiquement. Pour une vraie IA: brancher un fournisseur reel
  (cle + budget). L'architecture est prete (interface AIProvider).
- Canaux WhatsApp / e-mail / telephone / SMS: NON connectes. Le formulaire public
  et le fil de conversation web fonctionnent. "Envoyer" une reponse enregistre le
  message; il n'y a pas d'envoi reel vers le client.
- Invitation d'employe: l'invitation est bien creee en base, mais l'e-mail
  d'invitation n'est PAS envoye. Le flux "accepter via un lien" viendra ensuite.
- Devis, factures, rapports, statistiques avancees, automatisations, paiements,
  marketplace: PAS construits (phases suivantes).
- Fuseau horaire: pour le pilote, les heures de rendez-vous sont gerees en heure
  locale simple (coherent a l'ecran). Un modele de fuseau complet viendra plus tard.

## 3. Mise en ligne (etapes)

1. Pousser le code (GitHub Desktop): decompresser roavaa.zip, copier le CONTENU
   dans Documents\GitHub\ROA, choisir Remplacer, puis Commit et Push.
2. Vercel, projet ROA, Settings, Environment Variables. Ajouter pour Production,
   Preview et Development:
   - NEXT_PUBLIC_SUPABASE_URL = https://qbhtybzwkplmroqfgymn.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (cle publique fournie dans le chat)
   Puis Redeploy.
3. Supabase, Authentication:
   - Recommande pour un test fluide: Providers, Email, desactiver "Confirm email"
     (l'inscription connecte directement, sans e-mail de confirmation).
   - Si vous gardez la confirmation e-mail ou le reset de mot de passe: URL
     Configuration, mettre Site URL = https://roa-sigma.vercel.app et Redirect
     URLs = https://roa-sigma.vercel.app/**

Les cles publiques (URL + anon) sont protegees par la RLS et peuvent etre
exposees cote client. Ne jamais mettre la cle "service_role" (secrete) dans le
code ou dans GitHub.

## 4. Compte de test

- Aucun compte n'est pre-cree (par securite). Creez le votre via /nl/signup.
  Le premier utilisateur devient automatiquement proprietaire de son garage.
- Suggestion: creez un compte dedie au pilote (par exemple pilote@votregarage.nl),
  distinct de vos comptes reels.

## 5. Scenarios a tester (parcours complet)

1. Inscription, puis onboarding (creer le garage), arriver sur le tableau de bord.
2. Copier le lien du formulaire (section "Uw aanvraagformulier" du tableau de
   bord), l'ouvrir en navigation privee, envoyer une demande normale
   ("Mijn remmen piepen al een week"), verifier qu'elle apparait au tableau de bord.
3. Test urgence: envoyer "Er komt rook uit de motor". Doit arriver en "Kritiek"
   avec le badge "Menselijke controle".
4. Ouvrir la demande, voir le brouillon propose par Roavaa, le modifier, cliquer
   "Versturen". Le message s'ajoute au fil.
5. Inviter un membre (page Team), puis assigner ce mecanicien a une demande.
6. Proposer un creneau sur la demande, reserver, verifier dans l'Agenda.
7. Creer un ordre de reparation depuis la demande, ajouter des taches, changer
   le statut.
8. Ouvrir la fiche client, verifier les vehicules et l'historique.
9. Changer la langue NL / EN / FR et verifier les traductions.

## 6. Securite multi-tenant (etat)

- RLS activee sur les 15 tables (verifie).
- Isolation par organisation via une fonction securisee (current_user_org_ids).
  Un utilisateur ne voit que les organisations dont il est membre actif.
- Fonctions SECURITY DEFINER limitees et intentionnelles: creation de garage
  (create_organization), intake public (submit_public_request), affichage du nom
  public (public_org_display), liste des membres (org_members). Chacune agit
  uniquement dans le perimetre autorise (par slug ou par appartenance).
- Controle de securite Supabase: 0 erreur. Restent uniquement des avertissements
  "par conception" (fonctions que les utilisateurs connectes doivent pouvoir
  appeler pour creer leur garage et pour l'evaluation RLS).
- A prevoir avant un usage reel etendu: test de charge, revue juridique des
  mentions et de la confidentialite.

## 7. Limites connues

- IA simulee (pas de vraie generation).
- Pas d'envoi reel (e-mail, WhatsApp, SMS, telephone).
- Fuseau horaire simplifie.
- Pas de devis, factures ni paiements.
- Invitation employe sans e-mail d'acceptation.
- Nom "Roavaa" = nom de travail; verification de marque a faire.

## 8. Retour arriere (rollback)

- Code: dans GitHub Desktop, "Revert" du dernier commit; ou dans Vercel,
  Deployments, choisir un deploiement precedent et "Promote to Production".
- Base: les migrations sont additives. En cas de besoin, restaurer via les
  sauvegardes Supabase. Ne PAS executer de migration destructive pendant le pilote.

## 9. Donnees a NE JAMAIS utiliser pendant le pilote

- Aucune donnee bancaire ou de paiement (non gere).
- Pas de donnees clients sensibles au-dela du necessaire (RGPD) tant que la revue
  juridique n'est pas faite.
- Ne pas publier de statistiques ou temoignages inventes: les chiffres du produit
  doivent etre reels.
- Ne pas compter sur une reponse automatique de l'IA: elle est simulee, un humain
  doit valider et envoyer chaque reponse.

---

## 10. Ou en est le projet

- Phase 1 (coeur metier): COMPLETE. Clients, vehicules, ordres de reparation,
  rendez-vous, agenda, employes, attribution des taches, historique.
- Phase 2 (intelligence reelle): structure prete, IA simulee. Necessite un vrai
  modele (cle + budget).
- Phase 3 (connexions WhatsApp / e-mail / telephone): architecture prete.
  Necessite comptes + cles + budget par canal.
- Phase 4 (devis, factures, rapports, parametres, abonnements): a construire,
  faisable sans budget externe.

Prochaine etape recommandee: deployer, tester le parcours complet avec un vrai
garage, puis decider ou investir (IA reelle ou canaux).
