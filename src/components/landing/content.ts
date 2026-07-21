// Marketing landing copy + demo data, keyed by locale.
// Kept out of the i18n message bundles on purpose (self-contained marketing page).

export type Locale = 'nl' | 'en' | 'fr';

export interface StreamMsg {
  i: string;
  who: string;
  txt: string;
  roa: string;
  urgent?: boolean;
}

export const STREAM: Record<Locale, StreamMsg[]> = {
  nl: [
    { i: 'DV', who: 'Mevr. De Vries', txt: 'Mijn remmen piepen al een week. Kan ik langskomen?', roa: 'met voorrang gemarkeerd · antwoord verstuurd', urgent: true },
    { i: 'KB', who: 'Dhr. Bakker', txt: 'Airco blaast niet koud meer. Wat kost bijvullen?', roa: 'prijsindicatie gevraagd · afspraak voorgesteld' },
    { i: 'KY', who: 'K. Yilmaz', txt: 'APK verloopt vrijdag. Is er nog plek?', roa: '2 tijdslots voorgesteld · dossier aangemaakt' },
    { i: 'LJ', who: 'L. Jansen', txt: 'Motorlampje brandt. Is dat gevaarlijk?', roa: 'uitleg gegeven · controle ingepland' },
    { i: 'SM', who: 'S. Meijer', txt: 'Winterbanden wisselen, hebben jullie tijd?', roa: 'beschikbaarheid gedeeld · herinnering gezet' },
    { i: 'TP', who: 'T. Peeters', txt: 'Trekt naar links bij remmen. Kan dat kwaad?', roa: 'als controle gemarkeerd · afspraak voorgesteld' },
  ],
  en: [
    { i: 'DV', who: 'Ms. De Vries', txt: 'My brakes have been squeaking for a week. Can I come by?', roa: 'flagged with priority · reply sent', urgent: true },
    { i: 'KB', who: 'Mr. Bakker', txt: 'AC no longer blows cold. What does a refill cost?', roa: 'price estimate requested · appointment proposed' },
    { i: 'KY', who: 'K. Yilmaz', txt: 'MOT expires Friday. Any slots left?', roa: '2 time slots proposed · record created' },
    { i: 'LJ', who: 'L. Jansen', txt: 'Engine light is on. Is that dangerous?', roa: 'explained · check scheduled' },
    { i: 'SM', who: 'S. Meijer', txt: 'Winter tyre swap, do you have time?', roa: 'availability shared · reminder set' },
    { i: 'TP', who: 'T. Peeters', txt: 'Pulls left when braking. Is that a problem?', roa: 'flagged for inspection · appointment proposed' },
  ],
  fr: [
    { i: 'DV', who: 'Mme De Vries', txt: 'Mes freins grincent depuis une semaine. Je peux passer ?', roa: 'marqué en priorité · réponse envoyée', urgent: true },
    { i: 'KB', who: 'M. Bakker', txt: 'La clim ne souffle plus froid. Combien pour la recharge ?', roa: 'estimation demandée · rendez-vous proposé' },
    { i: 'KY', who: 'K. Yilmaz', txt: 'Le contrôle technique expire vendredi. Une place ?', roa: '2 créneaux proposés · dossier créé' },
    { i: 'LJ', who: 'L. Jansen', txt: 'Le voyant moteur est allumé. C\u2019est grave ?', roa: 'expliqué · contrôle planifié' },
    { i: 'SM', who: 'S. Meijer', txt: 'Changement pneus hiver, vous avez le temps ?', roa: 'disponibilités partagées · rappel programmé' },
    { i: 'TP', who: 'T. Peeters', txt: 'Ça tire à gauche au freinage. C\u2019est gênant ?', roa: 'marqué pour contrôle · rendez-vous proposé' },
  ],
};

interface Copy {
  nav: { work: string; robin: string; pricing: string; demo: string };
  hero: {
    kicker: string;
    pre: string; em: string; post: string;
    sub: string; ctaPrimary: string; ctaSecondary: string;
    sigB: string; sigRest: string;
  };
  device: { head: string; live: string; decide: string; decideB: string; approve: string; view: string };
  stakes: { pre: string; em: string; post: string; note: string };
  pillars: {
    title: string; tag: string;
    items: { t: string; p: string }[];
  };
  acts: {
    title: string; tag: string;
    items: { n: string; t: string; p: string }[];
  };
  robin: { titlePre: string; titleEm: string; lead: string; bullets: string[] };
  chat: {
    who: string; inMsg: string; outMsg: string;
    proposeLbl: string; propose: string; approve: string; adjust: string; decide: string;
  };
  simulation: {
    tag: string; titlePre: string; titleEm: string; sub: string;
    tabs: string[];
    step1: { who: string; msg: string; reply: string };
    step2: { label: string; lines: { d: string; price: string }[]; total: string };
    step3: { label: string; slots: string[]; confirmed: string };
    step4: { label: string; stages: string[]; current: number; note: string };
  };
  voice: {
    tag: string; title: string; sub: string;
    examples: { cmd: string; result: string }[];
  };
  memories: {
    title: string; tag: string;
    items: { k: string; t: string; p: string }[];
  };
  why: { title: string; tag: string; items: string[] };
  journey: { title: string; tag: string; steps: string[] };
  pwa: { tag: string; title: string; sub: string; bullets: string[]; ctaInstall: string };
  founder: { eyebrow: string; name: string; role: string; story: string[]; signature: string };
  close: { pre: string; em: string; post: string; ctaPrimary: string; ctaSecondary: string; sig: string };
  footer: string;
}

export const COPY: Record<Locale, Copy> = {
  nl: {
    nav: { work: 'Hoe het werkt', robin: 'Robin', pricing: 'Prijzen', demo: 'Vraag een demo aan' },
    founder: { eyebrow: 'Wie zit erachter', name: 'Prisca Akoua', role: 'Oprichter & CEO van Roavaa', story: ['Ik geloof dat ondernemers hun tijd moeten besteden aan het laten groeien van hun bedrijf, niet aan het najagen van gemiste oproepen, vergeten berichten of administratie.', 'Die overtuiging bracht mij ertoe Roavaa te maken: een AI-medewerker die kleine bedrijven helpt sneller te antwoorden, beter georganiseerd te zijn en geen kansen meer te verliezen.', 'Ik bouw niet alleen software. Ik bouw een digitale collega die naast ondernemers werkt, zodat zij zich kunnen richten op wat echt telt: hun klanten, hun vak en hun groei.'], signature: 'Innovatie heeft alleen waarde wanneer ze een echt probleem oplost.' },
    hero: {
      kicker: 'AI-medewerker voor de werkplaats',
      pre: 'Geen klant meer verliezen omdat u ', em: 'te laat', post: ' antwoordde.',
      sub: 'Roavaa beantwoordt elke aanvraag, ordent uw dag en leert uw garage kennen. Rustig, snel, en altijd onder uw controle.',
      ctaPrimary: 'Vraag een demo aan', ctaSecondary: 'Zie hoe het werkt',
      sigB: 'Reageert.', sigRest: 'Organiseert. Leert.',
    },
    device: { head: 'Binnenkomend · vandaag', live: 'live', decide: 'Robin stelt voor. ', decideB: 'U beslist.', approve: 'Goedkeuren', view: 'Bekijken' },
    stakes: {
      pre: 'Een gemiste oproep is een klant die ', em: 'de volgende garage', post: ' belt.',
      note: 'Een werkplaats staat nooit stil. Terwijl u onder een auto ligt, blijft de telefoon gaan, komt er een appje binnen, wacht er een offerte. Roavaa vangt alles op, zodat niets meer tussen wal en schip valt.',
    },
    pillars: {
      title: 'Alles wat uw garage nodig heeft, op één plek.', tag: 'De drie pijlers',
      items: [
        { t: 'Volledige voertuighistorie', p: 'Elke reparatie, elk gesprek en elke factuur op één tijdlijn per voertuig. Nooit meer zoeken in mappen of oude berichten.' },
        { t: 'Devissen, reparaties en facturen', p: 'Maak een devis in seconden, zet het om in een reparatie en daarna in een factuur. Zonder ooit iets dubbel in te typen.' },
        { t: 'Robin, uw AI-medewerker', p: 'Beantwoordt klanten, bereidt devissen voor en houdt de werkplaats georganiseerd — dag en nacht.' },
      ],
    },
    acts: {
      title: 'Drie dingen, onberispelijk gedaan.', tag: 'Reageert · Organiseert · Leert',
      items: [
        { n: '01 / Reageert', t: 'Antwoordt in seconden', p: 'Elke aanvraag krijgt direct een menselijk, professioneel antwoord, dag en nacht, in het Nederlands. De klant voelt zich gehoord voordat de concurrent opneemt.' },
        { n: '02 / Organiseert', t: 'Ordent uw hele dag', p: 'Klant, voertuig en afspraak komen vanzelf op de juiste plek. Geen briefjes op de balie, geen dubbele agenda\u2019s, geen vergeten terugbelverzoeken.' },
        { n: '03 / Leert', t: 'Wordt elke week scherper', p: 'Roavaa onthoudt uw uren, uw toon en uw voorkeuren. Hoe langer u samenwerkt, hoe meer het aanvoelt als een vaste kracht die uw garage door en door kent.' },
      ],
    },
    robin: {
      titlePre: 'Maak kennis met ', titleEm: 'Robin.',
      lead: 'Uw AI-medewerker. Robin praat met uw klanten, stelt voor wat er moet gebeuren, en legt de beslissing altijd bij u neer.',
      bullets: ['Belooft nooit een vaste prijs zonder uw akkoord.', 'Herkent noodgevallen en schakelt meteen een mens in.', 'Zegt eerlijk "dat weet ik niet" in plaats van iets te verzinnen.'],
    },
    chat: {
      who: 'Mevr. De Vries · 08:41',
      inMsg: 'Mijn remmen piepen al een week. Kan ik deze week nog langskomen?',
      outMsg: 'Natuurlijk. Kunt u het kenteken doorgeven? Dan stel ik twee momenten voor.',
      proposeLbl: 'Voorstel van Robin',
      propose: 'Piepende remmen kunnen op slijtage wijzen. Ik markeer dit met voorrang en stel donderdag 09:00 of vrijdag 14:30 voor.',
      approve: 'Goedkeuren', adjust: 'Aanpassen', decide: 'U beslist',
    },
    simulation: {
      tag: 'Live simulatie', titlePre: 'Bekijk ', titleEm: 'Robin', sub: 'Van eerste bericht tot afgeronde reparatie — dezelfde stroom die vandaag in echte garages draait.',
      tabs: ['Bericht', 'Devis', 'Afspraak', 'Opvolging'],
      step1: { who: 'Dhr. Peeters · WhatsApp', msg: 'Mijn Golf trekt naar links bij het remmen. Kan dat gevaarlijk zijn?', reply: 'Dat kan wijzen op versleten remblokken. Ik maak alvast een devis klaar en stel een moment voor.' },
      step2: { label: 'Robin stelt een devis op', lines: [{ d: 'Remblokken vooraan (set)', price: '€ 89,00' }, { d: 'Arbeid — 45 min', price: '€ 67,50' }, { d: 'BTW 21%', price: '€ 32,84' }], total: '€ 189,34' },
      step3: { label: 'Robin stelt een afspraak voor', slots: ['Donderdag 09:00', 'Vrijdag 14:30'], confirmed: 'Bevestigd voor vrijdag 14:30' },
      step4: { label: 'Robin volgt de reparatie op', stages: ['Ontvangen', 'Diagnose', 'Reparatie', 'Klaar'], current: 2, note: 'Dhr. Peeters krijgt automatisch bericht zodra zijn Golf klaar is.' },
    },
    voice: {
      tag: 'Spraakbediening', title: 'Praat gewoon met Robin.', sub: 'Typen is niet nodig. Spreek een opdracht in, Robin voert ze meteen uit.',
      examples: [
        { cmd: '"Robin, maak een devis voor deze Golf."', result: 'Devis DEV-2026-014 aangemaakt' },
        { cmd: '"Robin, bel deze klant morgen terug."', result: 'Herinnering gepland voor morgen 09:00' },
        { cmd: '"Robin, hoeveel hebben we deze week gefactureerd?"', result: '€ 4.280 gefactureerd deze week' },
      ],
    },
    memories: {
      title: 'Echte intelligentie, geen trucje.', tag: 'Drie soorten geheugen',
      items: [
        { k: '01 · Uw bedrijf', t: 'Kent uw garage', p: 'Uw uren, uw team, uw toon en uw voorkeuren. Blijft privé, alleen van u.' },
        { k: '02 · Het vak', t: 'Kent de branche', p: 'Reparaties, onderdelen, urgenties en de vragen die klanten altijd stellen.' },
        { k: '03 · Samen', t: 'Wordt slimmer', p: 'Leert anoniem welke antwoorden en herinneringen het best werken.' },
      ],
    },
    why: {
      title: 'Waarom garages voor Roavaa kiezen.', tag: 'Concrete voordelen',
      items: [
        'Geen enkele klant meer vergeten.',
        'Alle voertuiginformatie op één plek.',
        'Devissen razendsnel verstuurd.',
        'Professionele PDF-facturen.',
        'Automatische herinneringen.',
        'Elke dag tijd bespaard.',
      ],
    },
    journey: {
      title: 'Eén voertuig, één volledig parcours.', tag: 'Van ontvangst tot historiek',
      steps: ['Ontvangst', 'Inspectie', "Foto's", 'AI-diagnose', 'Devis', 'Akkoord klant', 'Reparatie', 'Factuur', 'Betaling', 'Historiek bewaard'],
    },
    pwa: {
      tag: 'Overal beschikbaar', title: 'Werkt op computer én telefoon.', sub: 'Installeer Roavaa rechtstreeks vanuit uw browser — geen Play Store of App Store nodig.',
      bullets: ['Direct installeerbaar vanaf uw browser (PWA)', 'Werkt op computer, tablet en smartphone', 'Altijd de laatste versie, zonder updates te installeren', 'Opent net als een echte app, met een eigen icoon op uw scherm'],
      ctaInstall: 'Zo installeert u Roavaa',
    },
    close: {
      pre: 'Klaar om geen enkele klant ', em: 'meer', post: ' te verliezen?',
      ctaPrimary: 'Vraag een demo aan', ctaSecondary: 'Praat met ons', sig: 'Reageert. Organiseert. Leert.',
    },
    footer: 'Roavaa · AI-medewerker voor onafhankelijke garages.',
  },
  en: {
    nav: { work: 'How it works', robin: 'Robin', pricing: 'Pricing', demo: 'Request a demo' },
    founder: { eyebrow: 'Who is behind this', name: 'Prisca Akoua', role: 'Founder & CEO of Roavaa', story: ['I believe entrepreneurs should spend their time growing their business, not chasing missed calls, forgotten messages or admin tasks.', 'That conviction is why I created Roavaa: an AI employee built to help small businesses reply faster, stay organized and stop losing opportunities.', 'I am not just building software. I am building a digital colleague that works alongside entrepreneurs, so they can focus on what truly matters: their customers, their craft and their growth.'], signature: 'Innovation only has value when it solves a real problem.' },
    hero: {
      kicker: 'AI employee for the workshop',
      pre: 'Never lose a customer because you answered ', em: 'too late', post: '.',
      sub: 'Roavaa answers every request, organises your day and learns your garage. Calm, fast, and always under your control.',
      ctaPrimary: 'Request a demo', ctaSecondary: 'See how it works',
      sigB: 'Responds.', sigRest: 'Organizes. Learns.',
    },
    device: { head: 'Incoming · today', live: 'live', decide: 'Robin proposes. ', decideB: 'You decide.', approve: 'Approve', view: 'View' },
    stakes: {
      pre: 'A missed call is a customer calling ', em: 'the next garage', post: '.',
      note: 'A workshop never stands still. While you are under a car, the phone keeps ringing, a message comes in, a quote is waiting. Roavaa catches it all, so nothing falls through the cracks.',
    },
    pillars: {
      title: 'Everything your garage needs, in one place.', tag: 'The three pillars',
      items: [
        { t: 'Complete vehicle history', p: 'Every repair, every conversation and every invoice on one timeline per vehicle. Never dig through folders or old messages again.' },
        { t: 'Quotes, repairs and invoices', p: 'Create a quote in seconds, turn it into a repair and then an invoice. Without ever typing anything twice.' },
        { t: 'Robin, your AI employee', p: 'Answers customers, prepares quotes and keeps the workshop organised — day and night.' },
      ],
    },
    acts: {
      title: 'Three things, done impeccably.', tag: 'Responds · Organizes · Learns',
      items: [
        { n: '01 / Responds', t: 'Answers in seconds', p: 'Every request gets an immediate, human, professional reply, day and night. The customer feels heard before the competitor even picks up.' },
        { n: '02 / Organizes', t: 'Orders your whole day', p: 'Customer, vehicle and appointment land in the right place on their own. No notes on the counter, no double agendas, no forgotten callbacks.' },
        { n: '03 / Learns', t: 'Gets sharper every week', p: 'Roavaa remembers your hours, your tone and your preferences. The longer you work together, the more it feels like a permanent colleague.' },
      ],
    },
    robin: {
      titlePre: 'Meet ', titleEm: 'Robin.',
      lead: 'Your AI employee. Robin talks to your customers, proposes what should happen, and always leaves the decision to you.',
      bullets: ['Never promises a fixed price without your approval.', 'Recognises emergencies and brings in a human at once.', 'Honestly says "I don\u2019t know" instead of inventing something.'],
    },
    chat: {
      who: 'Ms. De Vries · 08:41',
      inMsg: 'My brakes have been squeaking for a week. Can I still come by this week?',
      outMsg: 'Of course. Could you share the licence plate? Then I will propose two times.',
      proposeLbl: 'Robin proposes',
      propose: 'Squeaking brakes can indicate wear. I am flagging this with priority and propose Thursday 09:00 or Friday 14:30.',
      approve: 'Approve', adjust: 'Adjust', decide: 'You decide',
    },
    simulation: {
      tag: 'Live simulation', titlePre: 'Watch ', titleEm: 'Robin', sub: 'From the first message to a finished repair — the same flow running in real garages today.',
      tabs: ['Message', 'Quote', 'Appointment', 'Follow-up'],
      step1: { who: 'Mr. Peeters · WhatsApp', msg: 'My Golf pulls left when braking. Could that be dangerous?', reply: 'That can indicate worn brake pads. I am preparing a quote and proposing a time.' },
      step2: { label: 'Robin drafts a quote', lines: [{ d: 'Front brake pads (set)', price: '€ 89.00' }, { d: 'Labour — 45 min', price: '€ 67.50' }, { d: 'VAT 21%', price: '€ 32.84' }], total: '€ 189.34' },
      step3: { label: 'Robin proposes an appointment', slots: ['Thursday 09:00', 'Friday 14:30'], confirmed: 'Confirmed for Friday 14:30' },
      step4: { label: 'Robin tracks the repair', stages: ['Received', 'Diagnosis', 'Repair', 'Done'], current: 2, note: 'Mr. Peeters is automatically notified as soon as his Golf is ready.' },
    },
    voice: {
      tag: 'Voice control', title: 'Just talk to Robin.', sub: 'No typing needed. Speak a command, Robin carries it out instantly.',
      examples: [
        { cmd: '"Robin, create a quote for this Golf."', result: 'Quote QUO-2026-014 created' },
        { cmd: '"Robin, call this customer back tomorrow."', result: 'Reminder scheduled for tomorrow 09:00' },
        { cmd: '"Robin, how much have we invoiced this week?"', result: '€ 4,280 invoiced this week' },
      ],
    },
    memories: {
      title: 'Real intelligence, not a trick.', tag: 'Three kinds of memory',
      items: [
        { k: '01 · Your company', t: 'Knows your garage', p: 'Your hours, your team, your tone and your preferences. Stays private, only yours.' },
        { k: '02 · The trade', t: 'Knows the industry', p: 'Repairs, parts, emergencies and the questions customers always ask.' },
        { k: '03 · Together', t: 'Gets smarter', p: 'Learns anonymously which replies and reminders work best.' },
      ],
    },
    why: {
      title: 'Why garages choose Roavaa.', tag: 'Real-world benefits',
      items: [
        'No customer ever forgotten again.',
        'All vehicle information in one place.',
        'Quotes sent in minutes.',
        'Professional PDF invoices.',
        'Automatic reminders.',
        'Time saved every single day.',
      ],
    },
    journey: {
      title: 'One vehicle, one complete journey.', tag: 'From reception to history',
      steps: ['Reception', 'Inspection', 'Photos', 'AI diagnosis', 'Quote', 'Customer approval', 'Repair', 'Invoice', 'Payment', 'History saved'],
    },
    pwa: {
      tag: 'Available everywhere', title: 'Works on computer and phone.', sub: 'Install Roavaa directly from your browser — no Play Store or App Store required.',
      bullets: ['Installable straight from your browser (PWA)', 'Works on desktop, tablet and smartphone', 'Always the latest version, no updates to install', 'Opens just like a real app, with its own icon on your screen'],
      ctaInstall: 'How to install Roavaa',
    },
    close: {
      pre: 'Ready to never lose ', em: 'another', post: ' customer?',
      ctaPrimary: 'Request a demo', ctaSecondary: 'Talk to us', sig: 'Responds. Organizes. Learns.',
    },
    footer: 'Roavaa · AI employee for independent garages.',
  },
  fr: {
    nav: { work: 'Comment ça marche', robin: 'Robin', pricing: 'Tarifs', demo: 'Demander une démo' },
    founder: { eyebrow: 'Qui est derrière', name: 'Prisca Akoua', role: 'Fondatrice & CEO de Roavaa', story: ["Je crois que les entrepreneurs devraient consacrer leur temps à développer leur entreprise, pas à courir après les appels manqués, les messages oubliés ou les tâches administratives.", "C'est cette conviction qui m'a poussée à créer Roavaa : un employé IA conçu pour aider les petites entreprises à répondre plus vite, mieux s'organiser et ne plus perdre d'opportunités.", "Je ne construis pas seulement un logiciel. Je construis un collègue numérique qui travaille aux côtés des entrepreneurs, afin qu'ils puissent se concentrer sur ce qui compte vraiment : leurs clients, leur métier et leur croissance."], signature: "L'innovation n'a de valeur que lorsqu'elle résout un vrai problème." },
    hero: {
      kicker: 'Employé IA pour l\u2019atelier',
      pre: 'Ne plus perdre un client parce que vous avez répondu ', em: 'trop tard', post: '.',
      sub: 'Roavaa répond à chaque demande, organise votre journée et apprend à connaître votre garage. Calme, rapide, et toujours sous votre contrôle.',
      ctaPrimary: 'Demander une démo', ctaSecondary: 'Voir comment ça marche',
      sigB: 'Répond.', sigRest: 'Organise. Apprend.',
    },
    device: { head: 'Entrant · aujourd\u2019hui', live: 'en direct', decide: 'Robin propose. ', decideB: 'Vous décidez.', approve: 'Approuver', view: 'Voir' },
    stakes: {
      pre: 'Un appel manqué, c\u2019est un client qui appelle ', em: 'le garage suivant', post: '.',
      note: 'Un atelier ne s\u2019arrête jamais. Pendant que vous êtes sous une voiture, le téléphone sonne, un message arrive, un devis attend. Roavaa capte tout, pour que plus rien ne passe entre les mailles.',
    },
    pillars: {
      title: 'Tout ce dont votre garage a besoin, au même endroit.', tag: 'Les trois piliers',
      items: [
        { t: 'Historique complet du véhicule', p: 'Chaque réparation, chaque échange et chaque facture sur une seule chronologie par véhicule. Plus jamais besoin de fouiller dans des dossiers ou d\u2019anciens messages.' },
        { t: 'Devis, réparations et factures', p: 'Créez un devis en quelques secondes, transformez-le en ordre de réparation puis en facture. Sans jamais ressaisir la moindre information.' },
        { t: 'Robin, votre employé IA', p: 'Répond aux clients, prépare les devis et garde l\u2019atelier organisé — jour et nuit.' },
      ],
    },
    acts: {
      title: 'Trois choses, faites impeccablement.', tag: 'Répond · Organise · Apprend',
      items: [
        { n: '01 / Répond', t: 'Répond en quelques secondes', p: 'Chaque demande reçoit une réponse immédiate, humaine et professionnelle, jour et nuit. Le client se sent écouté avant même que le concurrent décroche.' },
        { n: '02 / Organise', t: 'Ordonne toute votre journée', p: 'Client, véhicule et rendez-vous se rangent tout seuls au bon endroit. Pas de papiers sur le comptoir, pas d\u2019agendas en double, pas de rappels oubliés.' },
        { n: '03 / Apprend', t: 'S\u2019affine chaque semaine', p: 'Roavaa retient vos horaires, votre ton et vos préférences. Plus vous travaillez ensemble, plus cela ressemble à un employé fidèle.' },
      ],
    },
    robin: {
      titlePre: 'Faites connaissance avec ', titleEm: 'Robin.',
      lead: 'Votre employé IA. Robin parle à vos clients, propose ce qu\u2019il faut faire, et vous laisse toujours la décision.',
      bullets: ['Ne promet jamais un prix fixe sans votre accord.', 'Reconnaît les urgences et fait appel à un humain aussitôt.', 'Dit honnêtement « je ne sais pas » au lieu d\u2019inventer.'],
    },
    chat: {
      who: 'Mme De Vries · 08:41',
      inMsg: 'Mes freins grincent depuis une semaine. Je peux passer cette semaine ?',
      outMsg: 'Bien sûr. Pouvez-vous indiquer la plaque ? Je proposerai deux créneaux.',
      proposeLbl: 'Proposition de Robin',
      propose: 'Des freins qui grincent peuvent indiquer de l\u2019usure. Je marque ceci en priorité et propose jeudi 09:00 ou vendredi 14:30.',
      approve: 'Approuver', adjust: 'Ajuster', decide: 'Vous décidez',
    },
    simulation: {
      tag: 'Simulation en direct', titlePre: 'Regardez ', titleEm: 'Robin', sub: 'Du premier message à la réparation terminée — le même parcours qui fonctionne aujourd\u2019hui dans de vrais garages.',
      tabs: ['Message', 'Devis', 'Rendez-vous', 'Suivi'],
      step1: { who: 'M. Peeters · WhatsApp', msg: 'Ma Golf tire à gauche au freinage. C\u2019est dangereux ?', reply: 'Cela peut indiquer des plaquettes usées. Je prépare un devis et propose un créneau.' },
      step2: { label: 'Robin prépare un devis', lines: [{ d: 'Plaquettes de frein avant (jeu)', price: '89,00 €' }, { d: 'Main d\u2019œuvre — 45 min', price: '67,50 €' }, { d: 'TVA 21 %', price: '32,84 €' }], total: '189,34 €' },
      step3: { label: 'Robin propose un rendez-vous', slots: ['Jeudi 09:00', 'Vendredi 14:30'], confirmed: 'Confirmé pour vendredi 14:30' },
      step4: { label: 'Robin suit la réparation', stages: ['Reçu', 'Diagnostic', 'Réparation', 'Terminé'], current: 2, note: 'M. Peeters est prévenu automatiquement dès que sa Golf est prête.' },
    },
    voice: {
      tag: 'Commande vocale', title: 'Parlez simplement à Robin.', sub: 'Pas besoin d\u2019écrire. Dites une consigne à voix haute, Robin l\u2019exécute aussitôt.',
      examples: [
        { cmd: '« Robin, crée un devis pour cette Golf. »', result: 'Devis DEV-2026-014 créé' },
        { cmd: '« Robin, rappelle ce client demain. »', result: 'Rappel programmé pour demain 09:00' },
        { cmd: '« Robin, combien avons-nous facturé cette semaine ? »', result: '4 280 € facturés cette semaine' },
      ],
    },
    memories: {
      title: 'De la vraie intelligence, pas un gadget.', tag: 'Trois mémoires',
      items: [
        { k: '01 · Votre entreprise', t: 'Connaît votre garage', p: 'Vos horaires, votre équipe, votre ton et vos préférences. Reste privé, rien qu\u2019à vous.' },
        { k: '02 · Le métier', t: 'Connaît la branche', p: 'Réparations, pièces, urgences et les questions que les clients posent toujours.' },
        { k: '03 · Ensemble', t: 'Devient plus intelligent', p: 'Apprend anonymement quelles réponses et relances fonctionnent le mieux.' },
      ],
    },
    why: {
      title: 'Pourquoi les garages choisissent ROAVAA ?', tag: 'Bénéfices concrets',
      items: [
        'Plus aucun client oublié.',
        'Toutes les informations du véhicule au même endroit.',
        'Devis envoyés rapidement.',
        'Factures PDF professionnelles.',
        'Rappels automatiques.',
        'Gain de temps chaque jour.',
      ],
    },
    journey: {
      title: 'Un véhicule, un parcours complet.', tag: 'De la réception à l\u2019historique',
      steps: ['Réception', 'Inspection', 'Photos', 'Diagnostic IA', 'Devis', 'Accord du client', 'Réparation', 'Facture', 'Paiement', 'Historique conservé'],
    },
    pwa: {
      tag: 'Disponible partout', title: 'Fonctionne sur ordinateur et téléphone.', sub: 'Installez ROAVAA directement depuis votre navigateur — sans passer par le Play Store ou l\u2019App Store.',
      bullets: ['Installable directement depuis votre navigateur (PWA)', 'Fonctionne sur ordinateur, tablette et smartphone', 'Toujours la dernière version, sans mise à jour à installer', 'S\u2019ouvre comme une vraie application, avec son icône sur votre écran'],
      ctaInstall: 'Comment installer ROAVAA',
    },
    close: {
      pre: 'Prêt à ne plus ', em: 'jamais', post: ' perdre un client ?',
      ctaPrimary: 'Demander une démo', ctaSecondary: 'Parlez-nous', sig: 'Répond. Organise. Apprend.',
    },
    footer: 'Roavaa · employé IA pour garages indépendants.',
  },
};
