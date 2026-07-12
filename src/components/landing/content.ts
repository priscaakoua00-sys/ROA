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
  nav: { work: string; robin: string; demo: string };
  hero: {
    kicker: string;
    pre: string; em: string; post: string;
    sub: string; ctaPrimary: string; ctaSecondary: string;
    sigB: string; sigRest: string;
  };
  device: { head: string; live: string; decide: string; decideB: string; approve: string; view: string };
  stakes: { pre: string; em: string; post: string; note: string };
  acts: {
    title: string; tag: string;
    items: { n: string; t: string; p: string }[];
  };
  robin: { titlePre: string; titleEm: string; lead: string; bullets: string[] };
  chat: {
    who: string; inMsg: string; outMsg: string;
    proposeLbl: string; propose: string; approve: string; adjust: string; decide: string;
  };
  memories: {
    title: string; tag: string;
    items: { k: string; t: string; p: string }[];
  };
  close: { pre: string; em: string; post: string; ctaPrimary: string; ctaSecondary: string; sig: string };
  footer: string;
}

export const COPY: Record<Locale, Copy> = {
  nl: {
    nav: { work: 'Hoe het werkt', robin: 'Robin', demo: 'Vraag een demo aan' },
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
    memories: {
      title: 'Echte intelligentie, geen trucje.', tag: 'Drie soorten geheugen',
      items: [
        { k: '01 · Uw bedrijf', t: 'Kent uw garage', p: 'Uw uren, uw team, uw toon en uw voorkeuren. Blijft privé, alleen van u.' },
        { k: '02 · Het vak', t: 'Kent de branche', p: 'Reparaties, onderdelen, urgenties en de vragen die klanten altijd stellen.' },
        { k: '03 · Samen', t: 'Wordt slimmer', p: 'Leert anoniem welke antwoorden en herinneringen het best werken.' },
      ],
    },
    close: {
      pre: 'Klaar om geen enkele klant ', em: 'meer', post: ' te verliezen?',
      ctaPrimary: 'Vraag een demo aan', ctaSecondary: 'Praat met ons', sig: 'Reageert. Organiseert. Leert.',
    },
    footer: 'Roavaa · AI-medewerker voor onafhankelijke garages.',
  },
  en: {
    nav: { work: 'How it works', robin: 'Robin', demo: 'Request a demo' },
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
    memories: {
      title: 'Real intelligence, not a trick.', tag: 'Three kinds of memory',
      items: [
        { k: '01 · Your company', t: 'Knows your garage', p: 'Your hours, your team, your tone and your preferences. Stays private, only yours.' },
        { k: '02 · The trade', t: 'Knows the industry', p: 'Repairs, parts, emergencies and the questions customers always ask.' },
        { k: '03 · Together', t: 'Gets smarter', p: 'Learns anonymously which replies and reminders work best.' },
      ],
    },
    close: {
      pre: 'Ready to never lose ', em: 'another', post: ' customer?',
      ctaPrimary: 'Request a demo', ctaSecondary: 'Talk to us', sig: 'Responds. Organizes. Learns.',
    },
    footer: 'Roavaa · AI employee for independent garages.',
  },
  fr: {
    nav: { work: 'Comment ça marche', robin: 'Robin', demo: 'Demander une démo' },
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
    memories: {
      title: 'De la vraie intelligence, pas un gadget.', tag: 'Trois mémoires',
      items: [
        { k: '01 · Votre entreprise', t: 'Connaît votre garage', p: 'Vos horaires, votre équipe, votre ton et vos préférences. Reste privé, rien qu\u2019à vous.' },
        { k: '02 · Le métier', t: 'Connaît la branche', p: 'Réparations, pièces, urgences et les questions que les clients posent toujours.' },
        { k: '03 · Ensemble', t: 'Devient plus intelligent', p: 'Apprend anonymement quelles réponses et relances fonctionnent le mieux.' },
      ],
    },
    close: {
      pre: 'Prêt à ne plus ', em: 'jamais', post: ' perdre un client ?',
      ctaPrimary: 'Demander une démo', ctaSecondary: 'Parlez-nous', sig: 'Répond. Organise. Apprend.',
    },
    footer: 'Roavaa · employé IA pour garages indépendants.',
  },
};
