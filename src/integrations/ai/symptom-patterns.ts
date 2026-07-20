import type { SupportedLanguage } from './types';

/**
 * Keyword-matched symptom categories for the mock photo-diagnosis provider.
 * A real vision model will eventually read the photos themselves; until
 * then this gives a mechanic something genuinely useful to start from when
 * they add a short note, and an honest "look at the photos yourself" answer
 * when they don't.
 */
interface SymptomTemplate {
  keywords: Record<SupportedLanguage, string[]>;
  probableCause: Record<SupportedLanguage, string>;
  partsToCheck: Record<SupportedLanguage, string[]>;
  nextSteps: Record<SupportedLanguage, string[]>;
}

const TEMPLATES: SymptomTemplate[] = [
  {
    keywords: {
      nl: ['piep', 'piepend', 'knarsen', 'rem'],
      en: ['squeal', 'squeak', 'grinding', 'brake'],
      fr: ['grince', 'crisse', 'frein'],
    },
    probableCause: {
      nl: 'Vermoedelijk versleten remblokken of remschijven.',
      en: 'Likely worn brake pads or discs.',
      fr: 'Probablement des plaquettes ou des disques de frein usés.',
    },
    partsToCheck: {
      nl: ['Remblokken', 'Remschijven', 'Remvloeistofpeil'],
      en: ['Brake pads', 'Brake discs', 'Brake fluid level'],
      fr: ['Plaquettes de frein', 'Disques de frein', "Niveau de liquide de frein"],
    },
    nextSteps: {
      nl: [
        'Wielen demonteren en remblokken inspecteren.',
        'Dikte van de remschijven meten.',
        'Proefrit maken bij lage snelheid.',
      ],
      en: [
        'Remove the wheels and inspect the pads.',
        'Measure disc thickness.',
        'Test drive at low speed.',
      ],
      fr: [
        'Démonter les roues et inspecter les plaquettes.',
        "Mesurer l'épaisseur des disques.",
        'Faire un essai à basse vitesse.',
      ],
    },
  },
  {
    keywords: {
      nl: ['lampje', 'controlelampje', 'motorlampje', 'check engine'],
      en: ['warning light', 'check engine', 'dashboard light'],
      fr: ['voyant', 'témoin', 'check engine'],
    },
    probableCause: {
      nl: 'Een foutcode via de boordcomputer geeft de exacte oorzaak.',
      en: "A fault code from the car's computer will confirm the exact cause.",
      fr: "Un code défaut via l'ordinateur de bord donnera la cause exacte.",
    },
    partsToCheck: {
      nl: ['Foutcodes (OBD)', 'Bougies', 'Lambdasonde'],
      en: ['Fault codes (OBD)', 'Spark plugs', 'Oxygen sensor'],
      fr: ['Codes défaut (OBD)', "Bougies d'allumage", 'Sonde lambda'],
    },
    nextSteps: {
      nl: [
        'OBD-scan uitvoeren en foutcodes noteren.',
        'Codes wissen na reparatie en opnieuw testen.',
        'Proefrit om te bevestigen dat het lampje uitblijft.',
      ],
      en: [
        'Run an OBD scan and note the fault codes.',
        'Clear codes after the repair and retest.',
        'Test drive to confirm the light stays off.',
      ],
      fr: [
        'Faire un scan OBD et noter les codes défaut.',
        'Effacer les codes après réparation et retester.',
        'Essai routier pour confirmer que le voyant reste éteint.',
      ],
    },
  },
  {
    keywords: {
      nl: ['lek', 'lekkage', 'vlek', 'vloeistof onder'],
      en: ['leak', 'leaking', 'puddle', 'stain under'],
      fr: ['fuite', 'tache', 'flaque'],
    },
    probableCause: {
      nl: 'Mogelijk een lekkage van motorolie, koelvloeistof of remvloeistof.',
      en: 'Possibly a leak of engine oil, coolant or brake fluid.',
      fr: "Probablement une fuite d'huile moteur, de liquide de refroidissement ou de frein.",
    },
    partsToCheck: {
      nl: ['Motorolie', 'Koelsysteem', 'Remvloeistofsysteem', 'Pakkingen'],
      en: ['Engine oil', 'Cooling system', 'Brake fluid system', 'Gaskets'],
      fr: ['Huile moteur', 'Circuit de refroidissement', 'Circuit de frein', 'Joints'],
    },
    nextSteps: {
      nl: [
        'Kleur en locatie van de vlek bepalen.',
        'Peilstok en vloeistofniveaus controleren.',
        'Voertuig op de brug zetten voor inspectie.',
      ],
      en: [
        'Identify the colour and location of the stain.',
        'Check the dipstick and fluid levels.',
        'Put the vehicle on the lift for inspection.',
      ],
      fr: [
        'Identifier la couleur et la position de la tache.',
        'Vérifier la jauge et les niveaux de liquide.',
        'Passer le véhicule au pont pour inspection.',
      ],
    },
  },
  {
    keywords: {
      nl: ['geluid', 'trilling', 'ratel', 'bonk', 'kraak'],
      en: ['noise', 'vibration', 'rattle', 'clunk', 'creak'],
      fr: ['bruit', 'vibration', 'cliquetis', 'craquement'],
    },
    probableCause: {
      nl: 'Kan wijzen op een los onderdeel, versleten lager of ophangingsprobleem.',
      en: 'Could point to a loose part, a worn bearing or a suspension issue.',
      fr: 'Peut indiquer une pièce desserrée, un roulement usé ou un problème de suspension.',
    },
    partsToCheck: {
      nl: ['Wiellagers', 'Ophanging', 'Uitlaatophanging'],
      en: ['Wheel bearings', 'Suspension', 'Exhaust mounts'],
      fr: ['Roulements de roue', 'Suspension', "Supports d'échappement"],
    },
    nextSteps: {
      nl: [
        'Proefrit maken en geluid lokaliseren.',
        'Ophanging en bevestigingen controleren.',
        'Wiellagers testen.',
      ],
      en: [
        'Test drive to locate the noise.',
        'Check suspension and mounting points.',
        'Test the wheel bearings.',
      ],
      fr: [
        'Essai routier pour localiser le bruit.',
        'Vérifier la suspension et les fixations.',
        'Tester les roulements de roue.',
      ],
    },
  },
  {
    keywords: {
      nl: ['start niet', 'accu', 'contact doet niets', 'slaat niet aan'],
      en: ["won't start", 'battery', 'no power', "doesn't start"],
      fr: ['ne démarre pas', 'batterie', 'rien ne se passe'],
    },
    probableCause: {
      nl: 'Waarschijnlijk een lege of verouderde accu, of een startprobleem.',
      en: 'Likely a flat or worn battery, or a starting issue.',
      fr: "Probablement une batterie à plat ou usée, ou un problème de démarrage.",
    },
    partsToCheck: {
      nl: ['Accu', 'Startmotor', 'Dynamo'],
      en: ['Battery', 'Starter motor', 'Alternator'],
      fr: ['Batterie', 'Démarreur', 'Alternateur'],
    },
    nextSteps: {
      nl: [
        'Accuspanning meten.',
        'Startmotor testen.',
        'Laadspanning van de dynamo controleren.',
      ],
      en: [
        'Measure battery voltage.',
        'Test the starter motor.',
        "Check the alternator's charging voltage.",
      ],
      fr: [
        'Mesurer la tension de la batterie.',
        'Tester le démarreur.',
        "Vérifier la tension de charge de l'alternateur.",
      ],
    },
  },
  {
    keywords: {
      nl: ['oververhit', 'warm loopt', 'airco koelt niet', 'airco doet niets'],
      en: ['overheating', 'running hot', "ac isn't cooling", 'ac not working'],
      fr: ['surchauffe', 'chauffe trop', 'clim ne refroidit pas'],
    },
    probableCause: {
      nl: 'Mogelijk een probleem met het koelsysteem of de airco.',
      en: 'Possibly a cooling system or air conditioning issue.',
      fr: 'Probablement un problème de refroidissement ou de climatisation.',
    },
    partsToCheck: {
      nl: ['Koelvloeistof', 'Thermostaat', 'Airco-compressor'],
      en: ['Coolant', 'Thermostat', 'AC compressor'],
      fr: ['Liquide de refroidissement', 'Thermostat', 'Compresseur de clim'],
    },
    nextSteps: {
      nl: [
        'Koelvloeistofpeil controleren.',
        'Ventilator en thermostaat testen.',
        'Airco-druk meten.',
      ],
      en: [
        'Check the coolant level.',
        'Test the fan and thermostat.',
        'Measure AC pressure.',
      ],
      fr: [
        'Vérifier le niveau de liquide de refroidissement.',
        'Tester le ventilateur et le thermostat.',
        'Mesurer la pression du circuit de clim.',
      ],
    },
  },
];

export interface SymptomMatch {
  probableCause: string;
  partsToCheck: string[];
  nextSteps: string[];
}

/** Match a free-text note against known symptom categories, if any note was given. */
export function matchSymptom(note: string, language: SupportedLanguage): SymptomMatch | null {
  const haystack = note.toLowerCase();
  const hit = TEMPLATES.find((t) => t.keywords[language].some((kw) => haystack.includes(kw)));
  if (!hit) return null;
  return {
    probableCause: hit.probableCause[language],
    partsToCheck: hit.partsToCheck[language],
    nextSteps: hit.nextSteps[language],
  };
}
