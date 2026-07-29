import type { DiagnosisHypothesis, DiagnosisSeverity } from './schemas';
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
  hypotheses: Record<SupportedLanguage, DiagnosisHypothesis[]>;
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
    hypotheses: {
      nl: [
        {
          cause: 'Versleten remblokken',
          probabilityPercent: 60,
          reasoning: 'Een hoog piepend geluid tijdens remmen is het klassieke signaal van een slijtage-indicator die de schijf raakt — verreweg de meest voorkomende oorzaak.',
        },
        {
          cause: 'Versleten of kromgetrokken remschijven',
          probabilityPercent: 30,
          reasoning: 'Bij knarsen of een pulserend rempedaal zijn de blokken vaak al doorgesleten tot op de schijf zelf.',
        },
      ],
      en: [
        {
          cause: 'Worn brake pads',
          probabilityPercent: 60,
          reasoning: "A high-pitched squeal while braking is the classic sound of a wear indicator contacting the disc — by far the most common cause.",
        },
        {
          cause: 'Worn or warped brake discs',
          probabilityPercent: 30,
          reasoning: 'Grinding or a pulsing brake pedal usually means the pads have already worn through to the discs themselves.',
        },
      ],
      fr: [
        {
          cause: 'Plaquettes de frein usées',
          probabilityPercent: 60,
          reasoning: "Un grincement aigu au freinage est le signe classique d'un témoin d'usure au contact du disque — de loin la cause la plus fréquente.",
        },
        {
          cause: 'Disques de frein usés ou voilés',
          probabilityPercent: 30,
          reasoning: 'Un crissement ou une pédale de frein qui pulse indique souvent que les plaquettes sont déjà usées jusqu’au disque.',
        },
      ],
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
    hypotheses: {
      nl: [
        {
          cause: 'Lambdasonde of uitlaatgasgerelateerd probleem',
          probabilityPercent: 30,
          reasoning: 'Lambdasonde- en emissiegerelateerde storingen zijn de meest voorkomende trigger voor een motorlampje op moderne voertuigen.',
        },
        {
          cause: 'Ontstekingsprobleem (bougies of spoelen)',
          probabilityPercent: 25,
          reasoning: 'Ontstekingsfouten door versleten bougies of een falende spoel komen vaak samen voor met een onregelmatig stationair toerental.',
        },
        {
          cause: 'Losse of defecte tankdop',
          probabilityPercent: 15,
          reasoning: 'Een losse of versleten tankdop veroorzaakt een EVAP-foutcode en is de eenvoudigste oorzaak om als eerste uit te sluiten.',
        },
      ],
      en: [
        {
          cause: 'Oxygen sensor or emissions-related fault',
          probabilityPercent: 30,
          reasoning: 'Oxygen sensor and emissions-system faults are the single most frequent trigger for a check-engine light on modern vehicles.',
        },
        {
          cause: 'Ignition system issue (spark plugs or coils)',
          probabilityPercent: 25,
          reasoning: 'Misfires from worn spark plugs or a failing ignition coil are a common cause and often come with a rough idle.',
        },
        {
          cause: 'Loose or faulty fuel cap',
          probabilityPercent: 15,
          reasoning: 'A loose or worn fuel cap triggers an EVAP fault code and is the simplest possible cause to rule out first.',
        },
      ],
      fr: [
        {
          cause: 'Sonde lambda ou problème lié aux émissions',
          probabilityPercent: 30,
          reasoning: "Les défauts de sonde lambda et de système d'émissions sont le déclencheur le plus fréquent d'un voyant moteur sur un véhicule récent.",
        },
        {
          cause: "Problème d'allumage (bougies ou bobines)",
          probabilityPercent: 25,
          reasoning: "Des ratés d'allumage dus à des bougies usées ou une bobine défaillante sont une cause fréquente, souvent accompagnée d'un ralenti irrégulier.",
        },
        {
          cause: 'Bouchon de réservoir desserré ou défectueux',
          probabilityPercent: 15,
          reasoning: "Un bouchon de réservoir desserré ou usé déclenche un code défaut EVAP — la cause la plus simple à écarter en premier.",
        },
      ],
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
    hypotheses: {
      nl: [
        {
          cause: 'Lekkage van motorolie',
          probabilityPercent: 50,
          reasoning: 'Een motorolielek is de meest voorkomende bron van een vlek onder een geparkeerd voertuig.',
        },
        {
          cause: 'Lekkage van koelvloeistof',
          probabilityPercent: 30,
          reasoning: 'Als de vlek helder groen, roze of blauw is in plaats van donker en olieachtig, wijst dat eerder op koelvloeistof.',
        },
        {
          cause: 'Lekkage van remvloeistof',
          probabilityPercent: 15,
          reasoning: 'Minder vaak, maar met hoger risico: controleer op een heldere tot amberkleurige, licht olieachtige vloeistof bij een wiel of de hoofdremcilinder.',
        },
      ],
      en: [
        {
          cause: 'Engine oil leak',
          probabilityPercent: 50,
          reasoning: 'Engine oil is the most common source of a stain under a parked vehicle.',
        },
        {
          cause: 'Coolant leak',
          probabilityPercent: 30,
          reasoning: 'If the stain is bright green, pink, or blue rather than dark and oily, coolant is the more likely source.',
        },
        {
          cause: 'Brake fluid leak',
          probabilityPercent: 15,
          reasoning: 'Less common but higher risk — check for a clear-to-amber, slightly oily fluid near a wheel or the master cylinder.',
        },
      ],
      fr: [
        {
          cause: "Fuite d'huile moteur",
          probabilityPercent: 50,
          reasoning: "L'huile moteur est la source la plus fréquente d'une tache sous un véhicule garé.",
        },
        {
          cause: 'Fuite de liquide de refroidissement',
          probabilityPercent: 30,
          reasoning: "Si la tache est vert vif, rose ou bleue plutôt que foncée et grasse, le liquide de refroidissement est plus probable.",
        },
        {
          cause: 'Fuite de liquide de frein',
          probabilityPercent: 15,
          reasoning: "Moins fréquent mais plus à risque : vérifiez la présence d'un liquide clair à ambré, légèrement gras, près d'une roue ou du maître-cylindre.",
        },
      ],
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
    hypotheses: {
      nl: [
        {
          cause: 'Los onderdeel',
          probabilityPercent: 45,
          reasoning: 'Een los onderdeel (hitteschild, bevestiging) is de eenvoudigste en meest voorkomende bron van een ratelend geluid, vooral over hobbels.',
        },
        {
          cause: 'Versleten lager',
          probabilityPercent: 30,
          reasoning: 'Een versleten wiellager geeft doorgaans een laag zoemend of knarsend geluid dat meeschaalt met de snelheid.',
        },
        {
          cause: 'Probleem met de ophanging',
          probabilityPercent: 20,
          reasoning: 'Versleten rubbers of kogelgewrichten veroorzaken vaak een bonk-geluid tijdens bochten of remmen.',
        },
      ],
      en: [
        {
          cause: 'A loose part',
          probabilityPercent: 45,
          reasoning: 'A loose part (heat shield, mounting bracket) is the simplest and most common source of a rattle, especially over bumps.',
        },
        {
          cause: 'A worn bearing',
          probabilityPercent: 30,
          reasoning: 'A worn wheel bearing typically produces a low humming or grinding noise that scales with vehicle speed.',
        },
        {
          cause: 'A suspension issue',
          probabilityPercent: 20,
          reasoning: 'Worn bushings or ball joints often cause a clunk during turning or braking.',
        },
      ],
      fr: [
        {
          cause: 'Une pièce desserrée',
          probabilityPercent: 45,
          reasoning: "Une pièce desserrée (bouclier thermique, fixation) est la source la plus simple et la plus fréquente d'un cliquetis, surtout sur les bosses.",
        },
        {
          cause: 'Un roulement usé',
          probabilityPercent: 30,
          reasoning: "Un roulement de roue usé produit en général un bourdonnement ou un grincement grave qui s'accentue avec la vitesse.",
        },
        {
          cause: 'Un problème de suspension',
          probabilityPercent: 20,
          reasoning: "Des silentblocs ou rotules usés provoquent souvent un bruit sourd en virage ou au freinage.",
        },
      ],
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
    hypotheses: {
      nl: [
        {
          cause: 'Lege of verouderde accu',
          probabilityPercent: 55,
          reasoning: 'Een lege of versleten accu is verreweg de meest voorkomende reden dat een voertuig niet start, zeker bij kou of na lang stilstaan.',
        },
        {
          cause: 'Startprobleem (startmotor)',
          probabilityPercent: 25,
          reasoning: 'Test de accu eerst goed; is die in orde, dan is een versleten startmotor (solenoïde of tandwielen) de volgende meest waarschijnlijke oorzaak.',
        },
        {
          cause: 'Defecte dynamo',
          probabilityPercent: 20,
          reasoning: 'Een falende dynamo laadt de accu onvoldoende op en kan na verloop van tijd een accustoring nabootsen — controleren als de accu steeds weer leegloopt.',
        },
      ],
      en: [
        {
          cause: 'Flat or worn battery',
          probabilityPercent: 55,
          reasoning: "A flat or worn battery is by far the most common reason a vehicle won't start, especially in cold weather or after sitting idle.",
        },
        {
          cause: 'Starting issue (starter motor)',
          probabilityPercent: 25,
          reasoning: "If the battery tests fine, a worn starter motor (solenoid or gears) is the next most likely cause.",
        },
        {
          cause: 'Faulty alternator',
          probabilityPercent: 20,
          reasoning: "A failing alternator undercharges the battery over time and can eventually mimic a battery failure — worth checking if the battery keeps going flat.",
        },
      ],
      fr: [
        {
          cause: 'Batterie à plat ou usée',
          probabilityPercent: 55,
          reasoning: "Une batterie à plat ou usée est de loin la raison la plus fréquente pour laquelle un véhicule ne démarre pas, surtout par temps froid ou après un long arrêt.",
        },
        {
          cause: 'Problème de démarreur',
          probabilityPercent: 25,
          reasoning: "Si la batterie est en bon état, un démarreur usé (solénoïde ou pignons) est la cause suivante la plus probable.",
        },
        {
          cause: 'Alternateur défectueux',
          probabilityPercent: 20,
          reasoning: "Un alternateur défaillant recharge mal la batterie au fil du temps et peut finir par imiter une panne de batterie — à vérifier si la batterie se décharge sans cesse.",
        },
      ],
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
    hypotheses: {
      nl: [
        {
          cause: 'Probleem met het koelsysteem',
          probabilityPercent: 65,
          reasoning: 'Oververhitting wijst vrijwel altijd op een koelsysteemprobleem: laag koelvloeistofpeil, een falende thermostaat of een verstopte radiateur.',
        },
        {
          cause: 'Probleem met de airco',
          probabilityPercent: 35,
          reasoning: 'Airco-problemen zijn meestal een koudemiddellek of een falende compressor, en staan meestal los van de motortemperatuur.',
        },
      ],
      en: [
        {
          cause: 'Cooling system issue',
          probabilityPercent: 65,
          reasoning: 'Overheating almost always points to a cooling-system issue — low coolant, a failing thermostat, or a blocked radiator.',
        },
        {
          cause: 'Air conditioning issue',
          probabilityPercent: 35,
          reasoning: 'AC issues are usually a refrigerant leak or a failing compressor, and are typically unrelated to engine temperature.',
        },
      ],
      fr: [
        {
          cause: 'Problème de circuit de refroidissement',
          probabilityPercent: 65,
          reasoning: "Une surchauffe indique presque toujours un problème de refroidissement : niveau de liquide bas, thermostat défaillant ou radiateur bouché.",
        },
        {
          cause: 'Problème de climatisation',
          probabilityPercent: 35,
          reasoning: "Les problèmes de clim sont généralement une fuite de fluide frigorigène ou un compresseur défaillant, sans lien avec la température moteur.",
        },
      ],
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
  hypotheses: DiagnosisHypothesis[];
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
    hypotheses: hit.hypotheses[language],
    affectedParts: hit.affectedParts[language],
    severity: hit.severity,
    additionalChecks: hit.additionalChecks[language],
    estimatedRepairTime: hit.estimatedRepairTime[language],
    recommendations: hit.recommendations[language],
  };
}
