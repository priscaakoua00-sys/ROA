import type { Locale } from '@/components/landing/content';
import type { BreakdownItem, Confidence, DealPosition, RiskCode } from '@/lib/valuation/engine';

export interface ValuationCopy {
  navLabel: string;
  title: string;
  intro: string;
  prompt: string;
  placeholder: string;
  open: string;
  // condition inputs
  conditionTitle: string;
  mileage: string;
  mechanical: string;
  aesthetic: string;
  repairCost: string;
  asking: string;
  askingHint: string;
  ratingLow: string;
  ratingHigh: string;
  // estimate
  estimateTitle: string;
  min: string;
  avg: string;
  max: string;
  confidence: string;
  confidenceValue: Record<Confidence, string>;
  breakdownTitle: string;
  breakdownLabel: Record<BreakdownItem['code'], string>;
  risksTitle: string;
  riskLabel: Record<RiskCode, string>;
  insufficient: string;
  disclaimer: string;
  save: string;
  saved: string;
  // Ruben's verdict
  dealTitle: string;
  verdict: (position: DealPosition, marginAvg: number, fmtMoney: (n: number) => string) => string;
}

export const VALUATION: Record<Locale, ValuationCopy> = {
  en: {
    navLabel: 'Buy / Resell',
    title: 'Pre-purchase analysis',
    intro: 'Ruben estimates a realistic value range from objective data — never a fixed price — and tells you whether the asking price makes sense.',
    prompt: 'Type a plate to analyse a vehicle.',
    placeholder: 'e.g. 6-XKD-69',
    open: 'Analyse',
    conditionTitle: 'Condition & mileage',
    mileage: 'Mileage (km)',
    mechanical: 'Mechanical condition',
    aesthetic: 'Bodywork condition',
    repairCost: 'Repairs needed (€)',
    asking: 'Asking price (€)',
    askingHint: 'Optional — enter it and Ruben judges the deal.',
    ratingLow: 'Poor',
    ratingHigh: 'Excellent',
    estimateTitle: 'Estimated value',
    min: 'Low', avg: 'Typical', max: 'High',
    confidence: 'Confidence',
    confidenceValue: { high: 'High', medium: 'Medium', low: 'Low' },
    breakdownTitle: 'How Ruben got there',
    breakdownLabel: {
      catalog: 'List price (new)', age: 'Age', mileage: 'Mileage', import: 'Import',
      odometer: 'Odometer flagged', defects: 'Known defects', mechanical: 'Mechanical', aesthetic: 'Bodywork', apk: 'Expired MOT', repairs: 'Repairs',
    },
    risksTitle: 'Points of attention',
    riskLabel: { odometer: 'Odometer judged illogical — verify the history', recall: 'Open manufacturer recall', apk: 'MOT has expired', import: 'Imported vehicle', highMileage: 'High mileage for its age' },
    insufficient: 'Not enough official data to estimate a value for this vehicle (no catalogue price on record). The rest of the file is still shown.',
    disclaimer: 'An indicative range from objective data — not a guarantee. The real price depends on condition, negotiation, and supply and demand. Always inspect the vehicle.',
    save: 'Save this analysis',
    saved: 'Analysis saved.',
    dealTitle: 'Is it worth the asking price?',
    verdict: (position, marginAvg, m) => {
      if (position === 'below') return `The asking price is below the typical range — potentially a good deal (about ${m(marginAvg)} under the typical value). Check why it is priced low.`;
      if (position === 'high') return `The asking price is above the range — it looks expensive (about ${m(-marginAvg)} over the typical value). Room to negotiate.`;
      return `The asking price sits within the estimated range — reasonable. Margin against the typical value is about ${m(marginAvg)}.`;
    },
  },
  nl: {
    navLabel: 'Kopen / Verkopen',
    title: 'Aankoopanalyse',
    intro: 'Ruben schat een realistische waardebandbreedte op basis van objectieve gegevens — nooit een vaste prijs — en beoordeelt of de vraagprijs klopt.',
    prompt: 'Typ een kenteken om een voertuig te analyseren.',
    placeholder: 'bijv. 6-XKD-69',
    open: 'Analyseren',
    conditionTitle: 'Staat & kilometerstand',
    mileage: 'Kilometerstand (km)',
    mechanical: 'Technische staat',
    aesthetic: 'Staat carrosserie',
    repairCost: 'Nodige reparaties (€)',
    asking: 'Vraagprijs (€)',
    askingHint: 'Optioneel — vul in en Ruben beoordeelt de deal.',
    ratingLow: 'Slecht',
    ratingHigh: 'Uitstekend',
    estimateTitle: 'Geschatte waarde',
    min: 'Laag', avg: 'Gemiddeld', max: 'Hoog',
    confidence: 'Betrouwbaarheid',
    confidenceValue: { high: 'Hoog', medium: 'Gemiddeld', low: 'Laag' },
    breakdownTitle: 'Zo komt Ruben erbij',
    breakdownLabel: {
      catalog: 'Catalogusprijs (nieuw)', age: 'Leeftijd', mileage: 'Kilometerstand', import: 'Import',
      odometer: 'Teller onlogisch', defects: 'Bekende gebreken', mechanical: 'Techniek', aesthetic: 'Carrosserie', apk: 'APK verlopen', repairs: 'Reparaties',
    },
    risksTitle: 'Aandachtspunten',
    riskLabel: { odometer: 'Teller als onlogisch beoordeeld — controleer de historie', recall: 'Openstaande terugroepactie', apk: 'APK is verlopen', import: 'Geïmporteerd voertuig', highMileage: 'Hoge kilometerstand voor de leeftijd' },
    insufficient: 'Onvoldoende officiële data om een waarde te schatten (geen catalogusprijs bekend). De rest van het dossier blijft zichtbaar.',
    disclaimer: 'Een indicatieve bandbreedte op basis van objectieve gegevens — geen garantie. De echte prijs hangt af van de staat, de onderhandeling en vraag en aanbod. Inspecteer het voertuig altijd.',
    save: 'Analyse opslaan',
    saved: 'Analyse opgeslagen.',
    dealTitle: 'Is de vraagprijs het waard?',
    verdict: (position, marginAvg, m) => {
      if (position === 'below') return `De vraagprijs ligt onder de bandbreedte — mogelijk een goede deal (ongeveer ${m(marginAvg)} onder de gemiddelde waarde). Ga na waarom hij laag geprijsd is.`;
      if (position === 'high') return `De vraagprijs ligt boven de bandbreedte — lijkt duur (ongeveer ${m(-marginAvg)} boven de gemiddelde waarde). Ruimte om te onderhandelen.`;
      return `De vraagprijs valt binnen de geschatte bandbreedte — redelijk. Marge tegenover de gemiddelde waarde is ongeveer ${m(marginAvg)}.`;
    },
  },
  fr: {
    navLabel: 'Acheter / Revendre',
    title: 'Analyse pré-achat',
    intro: 'Ruben estime une fourchette de valeur réaliste à partir de données objectives — jamais un prix fixe — et juge si le prix demandé est cohérent.',
    prompt: 'Tapez une plaque pour analyser un véhicule.',
    placeholder: 'ex. 6-XKD-69',
    open: 'Analyser',
    conditionTitle: 'État & kilométrage',
    mileage: 'Kilométrage (km)',
    mechanical: 'État mécanique',
    aesthetic: 'État carrosserie',
    repairCost: 'Réparations nécessaires (€)',
    asking: 'Prix demandé (€)',
    askingHint: 'Optionnel — saisissez-le et Ruben juge l’affaire.',
    ratingLow: 'Mauvais',
    ratingHigh: 'Excellent',
    estimateTitle: 'Valeur estimée',
    min: 'Basse', avg: 'Moyenne', max: 'Haute',
    confidence: 'Fiabilité',
    confidenceValue: { high: 'Élevée', medium: 'Moyenne', low: 'Faible' },
    breakdownTitle: 'Comment Ruben y arrive',
    breakdownLabel: {
      catalog: 'Prix catalogue (neuf)', age: 'Âge', mileage: 'Kilométrage', import: 'Import',
      odometer: 'Compteur signalé', defects: 'Défauts connus', mechanical: 'Mécanique', aesthetic: 'Carrosserie', apk: 'CT expiré', repairs: 'Réparations',
    },
    risksTitle: 'Points d’attention',
    riskLabel: { odometer: 'Compteur jugé illogique — vérifiez l’historique', recall: 'Rappel constructeur ouvert', apk: 'Le contrôle technique est expiré', import: 'Véhicule importé', highMileage: 'Kilométrage élevé pour l’âge' },
    insufficient: 'Données officielles insuffisantes pour estimer une valeur (pas de prix catalogue connu). Le reste du dossier reste affiché.',
    disclaimer: 'Une fourchette indicative à partir de données objectives — pas une garantie. Le prix réel dépend de l’état, de la négociation et de l’offre et la demande. Inspectez toujours le véhicule.',
    save: 'Enregistrer cette analyse',
    saved: 'Analyse enregistrée.',
    dealTitle: 'Vaut-elle le prix demandé ?',
    verdict: (position, marginAvg, m) => {
      if (position === 'below') return `Le prix demandé est sous la fourchette — potentiellement une bonne affaire (environ ${m(marginAvg)} sous la valeur moyenne). Vérifiez pourquoi il est bas.`;
      if (position === 'high') return `Le prix demandé est au-dessus de la fourchette — il paraît élevé (environ ${m(-marginAvg)} au-dessus de la valeur moyenne). Marge de négociation.`;
      return `Le prix demandé se situe dans la fourchette estimée — raisonnable. La marge par rapport à la valeur moyenne est d’environ ${m(marginAvg)}.`;
    },
  },
};
