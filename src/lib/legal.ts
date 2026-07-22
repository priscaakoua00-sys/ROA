import type { Locale } from '@/components/landing/content';

/**
 * Legal documents (Privacy Policy, Terms of Service, Cookie Policy), GDPR-aware,
 * in the three supported languages. Kept as structured data so the same page
 * component renders each one. Company registration details can be filled in
 * later via the constants below without touching the copy.
 */

/** Contact for privacy/data-subject requests. Point this alias at a real inbox. */
export const LEGAL_CONTACT_EMAIL = 'privacy@roavaa.com';
export const LEGAL_ENTITY = 'ROAVAA';
export const LEGAL_OPERATOR = 'Prisca Akoua';
export const LEGAL_UPDATED = '2026-07-22';

export type LegalBlock = string | { list: string[] };
export interface LegalSection {
  h: string;
  body: LegalBlock[];
}
export interface LegalDoc {
  title: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKey = 'privacy' | 'terms' | 'cookies';

const EN = {
  privacy: {
    title: 'Privacy Policy',
    updatedLabel: 'Last updated',
    intro:
      'This Privacy Policy explains how ROAVAA collects, uses and protects your personal data when you use our website and application, in accordance with the EU General Data Protection Regulation (GDPR).',
    sections: [
      {
        h: '1. Who we are (data controller)',
        body: [
          `${LEGAL_ENTITY}, operated by ${LEGAL_OPERATOR}, is the controller responsible for your personal data.`,
          `You can reach us for any privacy question or request at ${LEGAL_CONTACT_EMAIL}.`,
        ],
      },
      {
        h: '2. What data we collect',
        body: [
          'We collect only the data needed to provide the service:',
          {
            list: [
              'Account data: your name, email address and password (stored encrypted).',
              'Business data you enter: customers, vehicles, appointments, work orders, invoices and messages.',
              'Payment data: handled by our payment provider; we never store full card numbers.',
              'Technical data: IP address, device and browser type, and usage logs, for security and reliability.',
            ],
          },
        ],
      },
      {
        h: '3. Why we use it and our legal basis',
        body: [
          'We process your data to perform our contract with you (providing the service), on the basis of our legitimate interest (securing and improving the service), to comply with legal obligations (e.g. accounting), and on the basis of your consent where required (e.g. non-essential cookies).',
        ],
      },
      {
        h: '4. Who we share it with (processors)',
        body: [
          'We do not sell your data. We share it only with service providers who process it on our behalf under a data processing agreement:',
          {
            list: [
              'Supabase — database, authentication and file storage.',
              'Vercel — application hosting and delivery.',
              'Stripe — payment processing.',
              'Anthropic — the AI assistant that helps process your requests.',
            ],
          },
        ],
      },
      {
        h: '5. International transfers',
        body: [
          'Where data is transferred outside the European Economic Area, we rely on appropriate safeguards such as the European Commission’s Standard Contractual Clauses.',
        ],
      },
      {
        h: '6. How long we keep it',
        body: [
          'We keep your data for as long as your account is active, and afterwards only as long as needed to meet legal obligations or resolve disputes. You can ask us to delete your account and data at any time.',
        ],
      },
      {
        h: '7. Your rights',
        body: [
          'Under the GDPR you have the right to access, correct, delete, restrict or object to the processing of your data, and the right to data portability.',
          `To exercise any of these rights, contact ${LEGAL_CONTACT_EMAIL}. You also have the right to lodge a complaint with your local data protection authority (for the Netherlands, the Autoriteit Persoonsgegevens).`,
        ],
      },
      {
        h: '8. Security',
        body: [
          'We apply appropriate technical and organisational measures — including encryption in transit, access controls and row-level data isolation — to protect your data.',
        ],
      },
      {
        h: '9. Cookies',
        body: [
          'We use only the cookies strictly necessary to run the service (for example to keep you signed in). See our Cookie Policy for details.',
        ],
      },
      {
        h: '10. Changes to this policy',
        body: [
          'We may update this policy from time to time. The date above shows when it was last changed; material changes will be communicated in the app.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updatedLabel: 'Last updated',
    intro: 'These Terms govern your use of the ROAVAA website and application. By creating an account you agree to them.',
    sections: [
      { h: '1. The service', body: [`${LEGAL_ENTITY} provides an AI-assisted management application for independent garages and similar businesses.`] },
      { h: '2. Your account', body: ['You are responsible for keeping your login credentials safe and for the activity under your account. You must provide accurate information and be authorised to represent your business.'] },
      { h: '3. Acceptable use', body: ['You agree not to misuse the service, attempt to disrupt it, access it unlawfully, or use it to store or send unlawful content.'] },
      { h: '4. Trial and billing', body: ['Paid plans start with a 30-day free trial. €0 is charged during the trial, and you can cancel before it ends without being charged. After the trial, the plan renews monthly until cancelled.'] },
      { h: '5. Your data', body: ['You keep ownership of the business data you enter. We process it only to provide the service, as described in our Privacy Policy.'] },
      { h: '6. AI assistance', body: ['The AI assistant helps you work faster but can make mistakes. It does not replace your professional judgment; you remain responsible for decisions and for any communication sent to your customers.'] },
      { h: '7. Availability', body: ['We work to keep the service available and reliable, but we do not guarantee uninterrupted access and may perform maintenance.'] },
      { h: '8. Liability', body: ['To the extent permitted by law, the service is provided “as is” and our liability is limited to the amount you paid in the twelve months before the event giving rise to the claim.'] },
      { h: '9. Termination', body: ['You may stop using the service and delete your account at any time. We may suspend accounts that breach these Terms.'] },
      { h: '10. Governing law', body: ['These Terms are governed by the laws of the Netherlands, without prejudice to mandatory consumer protections in your country of residence.'] },
      { h: '11. Contact', body: [`Questions about these Terms: ${LEGAL_CONTACT_EMAIL}.`] },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    updatedLabel: 'Last updated',
    intro: 'This Cookie Policy explains how ROAVAA uses cookies and similar technologies.',
    sections: [
      { h: '1. What cookies are', body: ['Cookies are small files stored on your device that let a website remember your actions and preferences.'] },
      { h: '2. Cookies we use', body: ['We use only strictly necessary cookies:', { list: ['Authentication — to keep you securely signed in.', 'Preferences — to remember choices such as your language and theme.'] }] },
      { h: '3. What we don’t use', body: ['We do not use advertising or third-party tracking cookies.'] },
      { h: '4. Managing cookies', body: ['You can delete or block cookies in your browser settings, but the service may not work properly without the strictly necessary ones.'] },
      { h: '5. Contact', body: [`Questions about cookies: ${LEGAL_CONTACT_EMAIL}.`] },
    ],
  },
} satisfies Record<LegalKey, LegalDoc>;

const NL = {
  privacy: {
    title: 'Privacybeleid',
    updatedLabel: 'Laatst bijgewerkt',
    intro:
      'Dit privacybeleid legt uit hoe ROAVAA je persoonsgegevens verzamelt, gebruikt en beschermt wanneer je onze website en applicatie gebruikt, in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR).',
    sections: [
      { h: '1. Wie we zijn (verwerkingsverantwoordelijke)', body: [`${LEGAL_ENTITY}, beheerd door ${LEGAL_OPERATOR}, is verantwoordelijk voor de verwerking van je persoonsgegevens.`, `Voor privacyvragen of -verzoeken bereik je ons op ${LEGAL_CONTACT_EMAIL}.`] },
      { h: '2. Welke gegevens we verzamelen', body: ['We verzamelen alleen de gegevens die nodig zijn om de dienst te leveren:', { list: ['Accountgegevens: je naam, e-mailadres en wachtwoord (versleuteld opgeslagen).', 'Bedrijfsgegevens die je invoert: klanten, voertuigen, afspraken, werkorders, facturen en berichten.', 'Betaalgegevens: verwerkt door onze betaalprovider; we bewaren nooit volledige kaartnummers.', 'Technische gegevens: IP-adres, apparaat- en browsertype en gebruikslogs, voor beveiliging en betrouwbaarheid.'] }] },
      { h: '3. Waarom we ze gebruiken en onze grondslag', body: ['We verwerken je gegevens om onze overeenkomst met je uit te voeren (de dienst leveren), op basis van ons gerechtvaardigd belang (de dienst beveiligen en verbeteren), om aan wettelijke verplichtingen te voldoen (bijv. boekhouding), en op basis van je toestemming waar vereist (bijv. niet-essentiële cookies).'] },
      { h: '4. Met wie we ze delen (verwerkers)', body: ['We verkopen je gegevens niet. We delen ze alleen met dienstverleners die ze namens ons verwerken onder een verwerkersovereenkomst:', { list: ['Supabase — database, authenticatie en bestandsopslag.', 'Vercel — hosting en levering van de applicatie.', 'Stripe — betalingsverwerking.', 'Anthropic — de AI-assistent die helpt je aanvragen te verwerken.'] }] },
      { h: '5. Internationale doorgifte', body: ['Wanneer gegevens buiten de Europese Economische Ruimte worden doorgegeven, doen we dat met passende waarborgen zoals de modelcontractbepalingen van de Europese Commissie.'] },
      { h: '6. Hoe lang we ze bewaren', body: ['We bewaren je gegevens zolang je account actief is, en daarna alleen zolang nodig voor wettelijke verplichtingen of geschillen. Je kunt op elk moment vragen om je account en gegevens te verwijderen.'] },
      { h: '7. Je rechten', body: ['Op grond van de AVG heb je recht op inzage, correctie, verwijdering, beperking of bezwaar tegen de verwerking van je gegevens, en recht op overdraagbaarheid.', `Om deze rechten uit te oefenen, mail je ${LEGAL_CONTACT_EMAIL}. Je hebt ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens.`] },
      { h: '8. Beveiliging', body: ['We nemen passende technische en organisatorische maatregelen — waaronder versleuteling tijdens verzending, toegangscontrole en isolatie op rijniveau — om je gegevens te beschermen.'] },
      { h: '9. Cookies', body: ['We gebruiken alleen de cookies die strikt noodzakelijk zijn om de dienst te laten werken (bijvoorbeeld om je ingelogd te houden). Zie ons cookiebeleid voor details.'] },
      { h: '10. Wijzigingen', body: ['We kunnen dit beleid van tijd tot tijd bijwerken. De datum hierboven toont de laatste wijziging; belangrijke wijzigingen worden in de app gecommuniceerd.'] },
    ],
  },
  terms: {
    title: 'Gebruiksvoorwaarden',
    updatedLabel: 'Laatst bijgewerkt',
    intro: 'Deze voorwaarden regelen je gebruik van de website en applicatie van ROAVAA. Door een account aan te maken ga je ermee akkoord.',
    sections: [
      { h: '1. De dienst', body: [`${LEGAL_ENTITY} biedt een AI-ondersteunde beheerapplicatie voor onafhankelijke garages en vergelijkbare bedrijven.`] },
      { h: '2. Je account', body: ['Je bent verantwoordelijk voor het veilig houden van je inloggegevens en voor de activiteit onder je account. Je verstrekt juiste gegevens en bent bevoegd je bedrijf te vertegenwoordigen.'] },
      { h: '3. Toegestaan gebruik', body: ['Je gebruikt de dienst niet oneigenlijk, verstoort deze niet, verkrijgt geen onrechtmatige toegang en gebruikt de dienst niet voor onrechtmatige inhoud.'] },
      { h: '4. Proefperiode en facturatie', body: ['Betaalde abonnementen starten met 30 dagen gratis. Tijdens de proefperiode wordt €0 in rekening gebracht en je kunt vóór het einde opzeggen zonder kosten. Daarna verlengt het abonnement maandelijks tot opzegging.'] },
      { h: '5. Je gegevens', body: ['Je blijft eigenaar van de bedrijfsgegevens die je invoert. We verwerken ze alleen om de dienst te leveren, zoals beschreven in ons privacybeleid.'] },
      { h: '6. AI-ondersteuning', body: ['De AI-assistent helpt je sneller te werken maar kan fouten maken. Hij vervangt je vakkennis niet; jij blijft verantwoordelijk voor beslissingen en voor berichten aan je klanten.'] },
      { h: '7. Beschikbaarheid', body: ['We streven naar een beschikbare en betrouwbare dienst, maar garanderen geen ononderbroken toegang en kunnen onderhoud uitvoeren.'] },
      { h: '8. Aansprakelijkheid', body: ['Voor zover wettelijk toegestaan wordt de dienst “as is” geleverd en is onze aansprakelijkheid beperkt tot het bedrag dat je in de twaalf maanden vóór de gebeurtenis hebt betaald.'] },
      { h: '9. Beëindiging', body: ['Je kunt op elk moment stoppen en je account verwijderen. We kunnen accounts opschorten die deze voorwaarden schenden.'] },
      { h: '10. Toepasselijk recht', body: ['Op deze voorwaarden is Nederlands recht van toepassing, onverminderd dwingende consumentenbescherming in je land van verblijf.'] },
      { h: '11. Contact', body: [`Vragen over deze voorwaarden: ${LEGAL_CONTACT_EMAIL}.`] },
    ],
  },
  cookies: {
    title: 'Cookiebeleid',
    updatedLabel: 'Laatst bijgewerkt',
    intro: 'Dit cookiebeleid legt uit hoe ROAVAA cookies en vergelijkbare technologieën gebruikt.',
    sections: [
      { h: '1. Wat cookies zijn', body: ['Cookies zijn kleine bestanden op je apparaat waarmee een website je acties en voorkeuren kan onthouden.'] },
      { h: '2. Welke cookies we gebruiken', body: ['We gebruiken alleen strikt noodzakelijke cookies:', { list: ['Authenticatie — om je veilig ingelogd te houden.', 'Voorkeuren — om keuzes zoals je taal en thema te onthouden.'] }] },
      { h: '3. Wat we niet gebruiken', body: ['We gebruiken geen advertentie- of trackingcookies van derden.'] },
      { h: '4. Cookies beheren', body: ['Je kunt cookies verwijderen of blokkeren in je browserinstellingen, maar zonder de strikt noodzakelijke cookies werkt de dienst mogelijk niet goed.'] },
      { h: '5. Contact', body: [`Vragen over cookies: ${LEGAL_CONTACT_EMAIL}.`] },
    ],
  },
} satisfies Record<LegalKey, LegalDoc>;

const FR = {
  privacy: {
    title: 'Politique de confidentialité',
    updatedLabel: 'Dernière mise à jour',
    intro:
      'Cette politique de confidentialité explique comment ROAVAA collecte, utilise et protège vos données personnelles lorsque vous utilisez notre site et notre application, conformément au Règlement général sur la protection des données (RGPD).',
    sections: [
      { h: '1. Qui nous sommes (responsable du traitement)', body: [`${LEGAL_ENTITY}, exploité par ${LEGAL_OPERATOR}, est le responsable du traitement de vos données personnelles.`, `Pour toute question ou demande relative à la confidentialité, contactez-nous à ${LEGAL_CONTACT_EMAIL}.`] },
      { h: '2. Quelles données nous collectons', body: ['Nous collectons uniquement les données nécessaires à la fourniture du service :', { list: ['Données de compte : votre nom, votre adresse e-mail et votre mot de passe (stocké chiffré).', 'Données professionnelles que vous saisissez : clients, véhicules, rendez-vous, ordres de réparation, factures et messages.', 'Données de paiement : traitées par notre prestataire de paiement ; nous ne stockons jamais les numéros de carte complets.', 'Données techniques : adresse IP, type d’appareil et de navigateur, et journaux d’utilisation, pour la sécurité et la fiabilité.'] }] },
      { h: '3. Pourquoi nous les utilisons et notre base légale', body: ['Nous traitons vos données pour exécuter notre contrat avec vous (fournir le service), sur la base de notre intérêt légitime (sécuriser et améliorer le service), pour respecter des obligations légales (par ex. comptabilité), et sur la base de votre consentement lorsque requis (par ex. cookies non essentiels).'] },
      { h: '4. Avec qui nous les partageons (sous-traitants)', body: ['Nous ne vendons pas vos données. Nous les partageons uniquement avec des prestataires qui les traitent pour notre compte, dans le cadre d’un accord de traitement :', { list: ['Supabase — base de données, authentification et stockage de fichiers.', 'Vercel — hébergement et diffusion de l’application.', 'Stripe — traitement des paiements.', 'Anthropic — l’assistant IA qui aide à traiter vos demandes.'] }] },
      { h: '5. Transferts internationaux', body: ['Lorsque des données sont transférées hors de l’Espace économique européen, nous nous appuyons sur des garanties appropriées telles que les clauses contractuelles types de la Commission européenne.'] },
      { h: '6. Durée de conservation', body: ['Nous conservons vos données tant que votre compte est actif, puis uniquement le temps nécessaire pour respecter nos obligations légales ou régler d’éventuels litiges. Vous pouvez demander la suppression de votre compte et de vos données à tout moment.'] },
      { h: '7. Vos droits', body: ['En vertu du RGPD, vous avez le droit d’accéder à vos données, de les rectifier, de les effacer, d’en limiter le traitement ou de vous y opposer, ainsi qu’un droit à la portabilité.', `Pour exercer ces droits, écrivez à ${LEGAL_CONTACT_EMAIL}. Vous avez aussi le droit d’introduire une réclamation auprès de votre autorité de protection des données (par ex. la CNIL en France, l’Autoriteit Persoonsgegevens aux Pays-Bas).`] },
      { h: '8. Sécurité', body: ['Nous appliquons des mesures techniques et organisationnelles appropriées — dont le chiffrement en transit, le contrôle d’accès et l’isolation des données au niveau des lignes — pour protéger vos données.'] },
      { h: '9. Cookies', body: ['Nous utilisons uniquement les cookies strictement nécessaires au fonctionnement du service (par exemple pour vous garder connecté). Voir notre politique relative aux cookies.'] },
      { h: '10. Modifications', body: ['Nous pouvons mettre à jour cette politique. La date ci-dessus indique la dernière modification ; les changements importants seront communiqués dans l’application.'] },
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    updatedLabel: 'Dernière mise à jour',
    intro: 'Ces conditions régissent votre utilisation du site et de l’application ROAVAA. En créant un compte, vous les acceptez.',
    sections: [
      { h: '1. Le service', body: [`${LEGAL_ENTITY} fournit une application de gestion assistée par IA pour les garages indépendants et entreprises similaires.`] },
      { h: '2. Votre compte', body: ['Vous êtes responsable de la sécurité de vos identifiants et de l’activité sous votre compte. Vous devez fournir des informations exactes et être autorisé à représenter votre entreprise.'] },
      { h: '3. Usage acceptable', body: ['Vous vous engagez à ne pas détourner le service, à ne pas le perturber, à ne pas y accéder illégalement et à ne pas l’utiliser pour du contenu illicite.'] },
      { h: '4. Essai et facturation', body: ['Les formules payantes débutent par un essai gratuit de 30 jours. 0 € est facturé pendant l’essai et vous pouvez annuler avant la fin sans être facturé. Ensuite, l’abonnement se renouvelle chaque mois jusqu’à résiliation.'] },
      { h: '5. Vos données', body: ['Vous restez propriétaire des données professionnelles que vous saisissez. Nous les traitons uniquement pour fournir le service, comme décrit dans notre politique de confidentialité.'] },
      { h: '6. Assistance IA', body: ['L’assistant IA vous aide à travailler plus vite mais peut se tromper. Il ne remplace pas votre jugement professionnel ; vous restez responsable de vos décisions et des messages envoyés à vos clients.'] },
      { h: '7. Disponibilité', body: ['Nous nous efforçons d’assurer un service disponible et fiable, mais ne garantissons pas un accès ininterrompu et pouvons effectuer des opérations de maintenance.'] },
      { h: '8. Responsabilité', body: ['Dans les limites permises par la loi, le service est fourni « en l’état » et notre responsabilité est limitée au montant payé au cours des douze mois précédant le fait générateur.'] },
      { h: '9. Résiliation', body: ['Vous pouvez cesser d’utiliser le service et supprimer votre compte à tout moment. Nous pouvons suspendre les comptes qui enfreignent ces conditions.'] },
      { h: '10. Droit applicable', body: ['Ces conditions sont régies par le droit néerlandais, sans préjudice des protections impératives des consommateurs de votre pays de résidence.'] },
      { h: '11. Contact', body: [`Questions sur ces conditions : ${LEGAL_CONTACT_EMAIL}.`] },
    ],
  },
  cookies: {
    title: 'Politique relative aux cookies',
    updatedLabel: 'Dernière mise à jour',
    intro: 'Cette politique explique comment ROAVAA utilise les cookies et technologies similaires.',
    sections: [
      { h: '1. Ce que sont les cookies', body: ['Les cookies sont de petits fichiers stockés sur votre appareil qui permettent à un site de mémoriser vos actions et préférences.'] },
      { h: '2. Les cookies que nous utilisons', body: ['Nous utilisons uniquement des cookies strictement nécessaires :', { list: ['Authentification — pour vous garder connecté en toute sécurité.', 'Préférences — pour mémoriser des choix comme votre langue et votre thème.'] }] },
      { h: '3. Ce que nous n’utilisons pas', body: ['Nous n’utilisons pas de cookies publicitaires ni de traceurs tiers.'] },
      { h: '4. Gérer les cookies', body: ['Vous pouvez supprimer ou bloquer les cookies dans votre navigateur, mais sans les cookies strictement nécessaires, le service peut ne pas fonctionner correctement.'] },
      { h: '5. Contact', body: [`Questions sur les cookies : ${LEGAL_CONTACT_EMAIL}.`] },
    ],
  },
} satisfies Record<LegalKey, LegalDoc>;

export const LEGAL: Record<Locale, Record<LegalKey, LegalDoc>> = { en: EN, nl: NL, fr: FR };

/** Footer/link labels per locale. */
export const LEGAL_NAV: Record<Locale, Record<LegalKey, string>> = {
  en: { privacy: 'Privacy Policy', terms: 'Terms of Service', cookies: 'Cookie Policy' },
  nl: { privacy: 'Privacybeleid', terms: 'Gebruiksvoorwaarden', cookies: 'Cookiebeleid' },
  fr: { privacy: 'Politique de confidentialité', terms: 'Conditions d’utilisation', cookies: 'Cookies' },
};
