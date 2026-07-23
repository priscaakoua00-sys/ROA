import type { Locale } from '@/components/landing/content';
import type { FuelKey } from '@/integrations/rdw/client';
import type { VehicleInsight } from '@/lib/vehicle-analysis';

export interface SheetCopy {
  publicTag: string;
  dossierTag: string;
  dossierIntro: string;
  noPublic: string;
  sections: { engine: string; dimensions: string; registry: string; safety: string };
  badges: { apk: string; insured: string; recall: string; odometer: string; import: string };
  values: {
    valid: string;
    expired: string;
    yes: string;
    no: string;
    recallNone: string;
    recallOpen: string;
    logical: string;
    illogical: string;
    unknown: string;
    importYes: string;
  };
  labels: Record<string, string>;
  fuel: Record<FuelKey, string>;
  insight: (i: VehicleInsight, fmtDate: (iso: string) => string) => string;
  actions: { bookApk: string; notifyCustomer: string };
}

const LABELS_EN: Record<string, string> = {
  vehicleType: 'Type', bodywork: 'Body', color: 'Colour', category: 'EU category',
  fuel: 'Fuel', power: 'Power', displacement: 'Displacement', cylinders: 'Cylinders',
  co2: 'CO₂ emissions', emission: 'Emission class', energyLabel: 'Energy label', consumption: 'Consumption',
  length: 'Length', width: 'Width', wheelbase: 'Wheelbase', massEmpty: 'Kerb weight',
  massReady: 'Running weight', massMax: 'Max permitted weight', towing: 'Towing (braked)', seats: 'Seats', doors: 'Doors',
  firstAdmission: 'First registration', firstNl: 'First NL registration', registeredSince: 'Registered to owner since',
  catalogPrice: 'List price (new)', apk: 'MOT valid until',
};

const LABELS_NL: Record<string, string> = {
  vehicleType: 'Soort', bodywork: 'Carrosserie', color: 'Kleur', category: 'EU-categorie',
  fuel: 'Brandstof', power: 'Vermogen', displacement: 'Cilinderinhoud', cylinders: 'Cilinders',
  co2: 'CO₂-uitstoot', emission: 'Emissieklasse', energyLabel: 'Energielabel', consumption: 'Verbruik',
  length: 'Lengte', width: 'Breedte', wheelbase: 'Wielbasis', massEmpty: 'Massa ledig',
  massReady: 'Massa rijklaar', massMax: 'Max. toegestane massa', towing: 'Trekgewicht (geremd)', seats: 'Zitplaatsen', doors: 'Deuren',
  firstAdmission: 'Eerste toelating', firstNl: 'Eerste registratie NL', registeredSince: 'Op naam sinds',
  catalogPrice: 'Catalogusprijs (nieuw)', apk: 'APK geldig tot',
};

const LABELS_FR: Record<string, string> = {
  vehicleType: 'Type', bodywork: 'Carrosserie', color: 'Couleur', category: 'Catégorie UE',
  fuel: 'Carburant', power: 'Puissance', displacement: 'Cylindrée', cylinders: 'Cylindres',
  co2: 'Émissions CO₂', emission: 'Classe d’émission', energyLabel: 'Étiquette énergie', consumption: 'Consommation',
  length: 'Longueur', width: 'Largeur', wheelbase: 'Empattement', massEmpty: 'Masse à vide',
  massReady: 'Masse en ordre de marche', massMax: 'PTAC', towing: 'Remorquage (freiné)', seats: 'Places', doors: 'Portes',
  firstAdmission: '1re mise en circulation', firstNl: '1re immatriculation NL', registeredSince: 'Au nom actuel depuis',
  catalogPrice: 'Prix catalogue (neuf)', apk: 'Contrôle technique valide jusqu’au',
};

export const SHEET: Record<Locale, SheetCopy> = {
  en: {
    publicTag: 'Official data (RDW)',
    dossierTag: 'ROAVAA file',
    dossierIntro: 'Everything below is built by your garage over time — repairs, quotes, invoices, diagnostics and notes.',
    noPublic: 'No public RDW data found for this plate. You can still keep the full garage file below.',
    sections: { engine: 'Engine & energy', dimensions: 'Dimensions & weight', registry: 'Official registry', safety: 'Inspection & safety' },
    badges: { apk: 'MOT', insured: 'Insured', recall: 'Recall', odometer: 'Odometer', import: 'Import' },
    values: { valid: 'Valid', expired: 'Expired', yes: 'Yes', no: 'No', recallNone: 'None', recallOpen: 'Open', logical: 'Logical', illogical: 'Illogical', unknown: '—', importYes: 'Imported' },
    labels: LABELS_EN,
    fuel: { petrol: 'Petrol', diesel: 'Diesel', hybrid: 'Hybrid', electric: 'Electric', other: 'Other' },
    actions: { bookApk: 'Book MOT', notifyCustomer: 'Notify customer' },
    insight: (i, f) => {
      switch (i.code) {
        case 'apkExpired': return `MOT expired since ${f(i.date!)}. The vehicle may not be driven — offer an inspection.`;
        case 'apkSoon': return `MOT due in ${i.weeks} weeks (${f(i.date!)}). A good moment to book the customer.`;
        case 'recallOpen': return `Open manufacturer recall. Tell the customer — it is a safety item.`;
        case 'notInsured': return `Not registered as insured (WAM). Worth checking with the customer.`;
        case 'odometerIllogical': return `The RDW flags the odometer as illogical. Check the mileage history.`;
        case 'apkOk': return `MOT valid until ${f(i.date!)}. Nothing urgent.`;
        default: return `Everything checks out on the official data.`;
      }
    },
  },
  nl: {
    publicTag: 'Officiële data (RDW)',
    dossierTag: 'ROAVAA-dossier',
    dossierIntro: 'Alles hieronder bouwt je garage in de loop van de tijd op — reparaties, offertes, facturen, diagnoses en notities.',
    noPublic: 'Geen publieke RDW-data gevonden voor dit kenteken. Je kunt hieronder wel het volledige garagedossier bijhouden.',
    sections: { engine: 'Motor & energie', dimensions: 'Afmetingen & gewicht', registry: 'Officieel register', safety: 'Keuring & veiligheid' },
    badges: { apk: 'APK', insured: 'Verzekerd', recall: 'Recall', odometer: 'Teller', import: 'Import' },
    values: { valid: 'Geldig', expired: 'Verlopen', yes: 'Ja', no: 'Nee', recallNone: 'Geen', recallOpen: 'Open', logical: 'Logisch', illogical: 'Onlogisch', unknown: '—', importYes: 'Geïmporteerd' },
    labels: LABELS_NL,
    fuel: { petrol: 'Benzine', diesel: 'Diesel', hybrid: 'Hybride', electric: 'Elektrisch', other: 'Anders' },
    actions: { bookApk: 'APK inplannen', notifyCustomer: 'Klant informeren' },
    insight: (i, f) => {
      switch (i.code) {
        case 'apkExpired': return `APK verlopen sinds ${f(i.date!)}. Het voertuig mag niet rijden — bied een keuring aan.`;
        case 'apkSoon': return `APK verloopt over ${i.weeks} weken (${f(i.date!)}). Mooi moment om de klant in te plannen.`;
        case 'recallOpen': return `Openstaande terugroepactie. Informeer de klant — het is een veiligheidspunt.`;
        case 'notInsured': return `Niet geregistreerd als verzekerd (WAM). Even checken met de klant.`;
        case 'odometerIllogical': return `De RDW beoordeelt de tellerstand als onlogisch. Controleer de kilometerhistorie.`;
        case 'apkOk': return `APK geldig tot ${f(i.date!)}. Niets urgents.`;
        default: return `Alles is in orde volgens de officiële data.`;
      }
    },
  },
  fr: {
    publicTag: 'Données officielles (RDW)',
    dossierTag: 'Dossier ROAVAA',
    dossierIntro: 'Tout ce qui suit est construit par votre garage au fil du temps — réparations, devis, factures, diagnostics et notes.',
    noPublic: 'Aucune donnée publique RDW trouvée pour cette plaque. Vous pouvez tout de même tenir le dossier garage ci-dessous.',
    sections: { engine: 'Moteur & énergie', dimensions: 'Dimensions & poids', registry: 'Registre officiel', safety: 'Contrôle & sécurité' },
    badges: { apk: 'CT', insured: 'Assuré', recall: 'Rappel', odometer: 'Compteur', import: 'Import' },
    values: { valid: 'Valide', expired: 'Expiré', yes: 'Oui', no: 'Non', recallNone: 'Aucun', recallOpen: 'Ouvert', logical: 'Logique', illogical: 'Illogique', unknown: '—', importYes: 'Importé' },
    labels: LABELS_FR,
    fuel: { petrol: 'Essence', diesel: 'Diesel', hybrid: 'Hybride', electric: 'Électrique', other: 'Autre' },
    actions: { bookApk: 'Planifier le CT', notifyCustomer: 'Prévenir le client' },
    insight: (i, f) => {
      switch (i.code) {
        case 'apkExpired': return `Contrôle technique expiré depuis le ${f(i.date!)}. Le véhicule ne peut pas rouler — proposez une visite.`;
        case 'apkSoon': return `Contrôle technique à renouveler dans ${i.weeks} semaines (${f(i.date!)}). Bon moment pour réserver le client.`;
        case 'recallOpen': return `Rappel constructeur ouvert. Prévenez le client — c’est un point de sécurité.`;
        case 'notInsured': return `Non enregistré comme assuré (WAM). À vérifier avec le client.`;
        case 'odometerIllogical': return `La RDW juge le compteur « illogique ». Vérifiez l’historique kilométrique.`;
        case 'apkOk': return `Contrôle technique valide jusqu’au ${f(i.date!)}. Rien d’urgent.`;
        default: return `Tout est en ordre côté données officielles.`;
      }
    },
  },
};
