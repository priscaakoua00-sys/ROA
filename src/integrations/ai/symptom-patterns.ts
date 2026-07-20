import type { DiagnosisSeverity } from './schemas';
import type { SupportedLanguage } from './types';

/**
 * Keyword-matched symptom categories for the mock diagnosis provider.
 * A real vision model will eventually read the photos themselves; until
 * then this gives a mechanic something genuinely useful to start from when
 * they add a short note, and an honest "look at the photos yourself" answer
 * when they don't.
 */
interface SymptomTemplate {
  keywords: Record<SupportedLanguage, string[]>;
  causes: Record<SupportedLanguage, string[]>;
  affectedParts: Record<SupportedLanguage, string[]>;
  severity: DiagnosisSeverity;
  additionalChecks: Record<SupportedLanguage, string[]>;
  estimatedRepairTime: Record<SupportedLanguage, string>;
  recommendations: Record<SupportedLanguage, string[]>;
}

const TEMPLATES: SymptomTemplate[] = [
  {
    keywords: {
      nl: ['piep', 'piepend', 'knarsen', 'rem'],
      en: ['squeal', 'squeak', 'grinding', 'brake'],
      fr: ['grince', 'crisse', 'frein'],
    },
    causes: {
      nl: ['Versleten remblokken', 'Versleten of kromgetrokken remschijven'],
      en: ['Worn brake pads', 'Worn or warped brake discs'],
      fr: ['Plaquettes de frein usées', 'Disques de frein usés ou voilés'],
    },
    affectedParts: {
      nl: ['Remblokken', 'Remschijven', 'Remvloeistofsysteem'],
      en: ['Brake pads', 'Brake discs', 'Brake fluid system'],
      fr: ['Plaquettes de frein', 'Disques de frein', 'Circuit de frein'],
    },
    severity: 'high',
    additionalChecks: {
      nl: ['Wielen demonteren en remblokken inspecteren.', 'Dikte van de remschijven meten.', 'Proefrit maken bij lage snelheid.'],
      en: ['Remove the wheels and inspect the pads.', 'Measure disc thickness.', 'Test drive at low speed.'],
      fr: ['Démonter les roues et inspecter les plaquettes.', "Mesurer l'épaisseur des disques.", 'Faire un essai à basse vitesse.'],
    },
    estimatedRepairTime: { nl: '1-2 uur', en: '1-2 hours', fr: '1 à 2 heures' },
    recommendations: {
      nl: ['Adviseer de klant voorzichtig te rijden tot de remmen zijn nagekeken.', 'Plan de inspectie zo snel mogelijk in.'],
      en: ['Advise the customer to drive carefully until the brakes are checked.', 'Schedule the inspection as soon as possible.'],
      fr: ["Conseillez au client de rouler prudemment jusqu'à l'inspection des freins.", "Planifiez l'inspection au plus vite."],
    },
  },
  {
    keywords: {
      nl: ['lampje', 'controlelampje', 'motorlampje', 'check engine'],
      en: ['warning light', 'check engine', 'dashboard light'],
      fr: ['voyant', 'témoin', 'check engine'],
    },
    causes: {
      nl: ['Een foutcode via de boordcomputer geeft de exacte oorzaak.'],
      en: ["A fault code from the car's computer will confirm the exact cause."],
      fr: ["Un code défaut via l'ordinateur de bord donnera la cause exacte."],
    },
    affectedParts: {
      nl: ['Bougies', 'Lambdasonde', 'Elektronica/sensoren'],
      en: ['Spark plugs', 'Oxygen sensor', 'Electronics/sensors'],
      fr: ["Bougies d'allumage", 'Sonde lambda', 'Électronique/capteurs'],
    },
    severity: 'medium',
    additionalChecks: {
      nl: ['OBD-scan uitvoeren en foutcodes noteren.', 'Codes wissen na reparatie en opnieuw testen.', 'Proefrit om te bevestigen dat het lampje uitblijft.'],
      en: ['Run an OBD scan and note the fault codes.', 'Clear codes after the repair and retest.', 'Test drive to confirm the light stays off.'],
      fr: ['Faire un scan OBD et noter les codes défaut.', 'Effacer les codes après réparation et retester.', 'Essai routier pour confirmer que le voyant reste éteint.'],
    },
    estimatedRepairTime: { nl: '30 min - 1 uur (na diagnose)', en: '30 min - 1 hour (after diagnosis)', fr: '30 min à 1 heure (après diagnostic)' },
    recommendations: {
      nl: ['Leg de klant uit dat een OBD-scan nodig is voor een exacte diagnose.'],
      en: ['Explain to the customer that an OBD scan is needed for an exact diagnosis.'],
      fr: ["Expliquez au client qu'un scan OBD est nécessaire pour un diagnostic exact."],
    },
  },
  {
    keywords: {
      nl: ['lek', 'lekkage', 'vlek', 'vloeistof onder'],
      en: ['leak', 'leaking', 'puddle', 'stain under'],
      fr: ['fuite', 'tache', 'flaque'],
    },
    causes: {
      nl: ['Lekkage van motorolie', 'Lekkage van koelvloeistof', 'Lekkage van remvloeistof'],
      en: ['Engine oil leak', 'Coolant leak', 'Brake fluid leak'],
      fr: ["Fuite d'huile moteur", 'Fuite de liquide de refroidissement', 'Fuite de liquide de frein'],
    },
    affectedParts: {
      nl: ['Motorolie', 'Koelsysteem', 'Remvloeistofsysteem', 'Pakkingen'],
      en: ['Engine oil', 'Cooling system', 'Brake fluid system', 'Gaskets'],
      fr: ['Huile moteur', 'Circuit de refroidissement', 'Circuit de frein', 'Joints'],
    },
    severity: 'medium',
    additionalChecks: {
      nl: ['Kleur en locatie van de vlek bepalen.', 'Peilstok en vloeistofniveaus controleren.', 'Voertuig op de brug zetten voor inspectie.'],
      en: ['Identify the colour and location of the stain.', 'Check the dipstick and fluid levels.', 'Put the vehicle on the lift for inspection.'],
      fr: ['Identifier la couleur et la position de la tache.', 'Vérifier la jauge et les niveaux de liquide.', 'Passer le véhicule au pont pour inspection.'],
    },
    estimatedRepairTime: { nl: '1-3 uur, afhankelijk van de bron', en: '1-3 hours, depending on the source', fr: "1 à 3 heures, selon l'origine" },
    recommendations: {
      nl: ['Vraag de klant of het niveaupeil recent is gecontroleerd.', 'Waarschuw bij een remvloeistoflek: niet rijden tot inspectie.'],
      en: ['Ask the customer whether fluid levels were checked recently.', 'On a suspected brake fluid leak: advise against driving until inspected.'],
      fr: ["Demandez au client si les niveaux ont été vérifiés récemment.", "En cas de suspicion de fuite de frein : déconseillez de rouler avant inspection."],
    },
  },
  {
    keywords: {
      nl: ['geluid', 'trilling', 'ratel', 'bonk', 'kraak'],
      en: ['noise', 'vibration', 'rattle', 'clunk', 'creak'],
      fr: ['bruit', 'vibration', 'cliquetis', 'craquement'],
    },
    causes: {
      nl: ['Los onderdeel', 'Versleten lager', 'Probleem met de ophanging'],
      en: ['A loose part', 'A worn bearing', 'A suspension issue'],
      fr: ['Une pièce desserrée', 'Un roulement usé', 'Un problème de suspension'],
    },
    affectedParts: {
      nl: ['Wiellagers', 'Ophanging', 'Uitlaatophanging'],
      en: ['Wheel bearings', 'Suspension', 'Exhaust mounts'],
      fr: ['Roulements de roue', 'Suspension', "Supports d'échappement"],
    },
    severity: 'medium',
    additionalChecks: {
      nl: ['Proefrit maken en geluid lokaliseren.', 'Ophanging en bevestigingen controleren.', 'Wiellagers testen.'],
      en: ['Test drive to locate the noise.', 'Check suspension and mounting points.', 'Test the wheel bearings.'],
      fr: ['Essai routier pour localiser le bruit.', 'Vérifier la suspension et les fixations.', 'Tester les roulements de roue.'],
    },
    estimatedRepairTime: { nl: '1-2 uur, meer indien onderdelen nodig zijn', en: '1-2 hours, more if parts are needed', fr: '1 à 2 heures, plus si des pièces sont nécessaires' },
    recommendations: {
      nl: ['Vraag de klant wanneer het geluid optreedt (bochten, remmen, hobbels).'],
      en: ['Ask the customer when the noise happens (turning, braking, bumps).'],
      fr: ['Demandez au client quand le bruit se produit (virages, freinage, bosses).'],
    },
  },
  {
    keywords: {
      nl: ['start niet', 'accu', 'contact doet niets', 'slaat niet aan'],
      en: ["won't start", 'battery', 'no power', "doesn't start"],
      fr: ['ne démarre pas', 'batterie', 'rien ne se passe'],
    },
    causes: {
      nl: ['Lege of verouderde accu', 'Startprobleem', 'Defecte dynamo'],
      en: ['Flat or worn battery', 'Starting issue', 'Faulty alternator'],
      fr: ['Batterie à plat ou usée', 'Problème de démarrage', 'Alternateur défectueux'],
    },
    affectedParts: {
      nl: ['Accu', 'Startmotor', 'Dynamo'],
      en: ['Battery', 'Starter motor', 'Alternator'],
      fr: ['Batterie', 'Démarreur', 'Alternateur'],
    },
    severity: 'high',
    additionalChecks: {
      nl: ['Accuspanning meten.', 'Startmotor testen.', 'Laadspanning van de dynamo controleren.'],
      en: ['Measure battery voltage.', 'Test the starter motor.', "Check the alternator's charging voltage."],
      fr: ['Mesurer la tension de la batterie.', 'Tester le démarreur.', "Vérifier la tension de charge de l'alternateur."],
    },
    estimatedRepairTime: { nl: '30-45 min indien accu, langer bij startmotor/dynamo', en: '30-45 min if battery, longer for starter/alternator', fr: '30 à 45 min si batterie, plus long pour démarreur/alternateur' },
    recommendations: {
      nl: ['Vraag de klant of het voertuig ergens veilig geparkeerd staat.'],
      en: ['Ask the customer whether the vehicle is parked somewhere safe.'],
      fr: ['Demandez au client si le véhicule est garé en lieu sûr.'],
    },
  },
  {
    keywords: {
      nl: ['oververhit', 'warm loopt', 'airco koelt niet', 'airco doet niets'],
      en: ['overheating', 'running hot', "ac isn't cooling", 'ac not working'],
      fr: ['surchauffe', 'chauffe trop', 'clim ne refroidit pas'],
    },
    causes: {
      nl: ['Probleem met het koelsysteem', 'Probleem met de airco'],
      en: ['Cooling system issue', 'Air conditioning issue'],
      fr: ['Problème de refroidissement', 'Problème de climatisation'],
    },
    affectedParts: {
      nl: ['Koelvloeistof', 'Thermostaat', 'Airco-compressor'],
      en: ['Coolant', 'Thermostat', 'AC compressor'],
      fr: ['Liquide de refroidissement', 'Thermostat', 'Compresseur de clim'],
    },
    severity: 'high',
    additionalChecks: {
      nl: ['Koelvloeistofpeil controleren.', 'Ventilator en thermostaat testen.', 'Airco-druk meten.'],
      en: ['Check the coolant level.', 'Test the fan and thermostat.', 'Measure AC pressure.'],
      fr: ['Vérifier le niveau de liquide de refroidissement.', 'Tester le ventilateur et le thermostat.', 'Mesurer la pression du circuit de clim.'],
    },
    estimatedRepairTime: { nl: '1-2 uur, afhankelijk van de oorzaak', en: '1-2 hours, depending on the cause', fr: "1 à 2 heures, selon la cause" },
    recommendations: {
      nl: ['Waarschuw de klant om niet verder te rijden bij oververhitting.'],
      en: ['Advise the customer not to keep driving if the engine is overheating.'],
      fr: ['Déconseillez au client de continuer à rouler en cas de surchauffe.'],
    },
  },
];

export interface SymptomMatch {
  causes: string[];
  affectedParts: string[];
  severity: DiagnosisSeverity;
  additionalChecks: string[];
  estimatedRepairTime: string;
  recommendations: string[];
}

/** Match a free-text note against known symptom categories, if any note was given. */
export function matchSymptom(note: string, language: SupportedLanguage): SymptomMatch | null {
  const haystack = note.toLowerCase();
  const hit = TEMPLATES.find((t) => t.keywords[language].some((kw) => haystack.includes(kw)));
  if (!hit) return null;
  return {
    causes: hit.causes[language],
    affectedParts: hit.affectedParts[language],
    severity: hit.severity,
    additionalChecks: hit.additionalChecks[language],
    estimatedRepairTime: hit.estimatedRepairTime[language],
    recommendations: hit.recommendations[language],
  };
}
