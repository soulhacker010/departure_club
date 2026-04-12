// @ts-nocheck
// ══════════════════════════════════════════════
// CONSTANTS — Hubs, Regions, Config
// ══════════════════════════════════════════════

// Australian departure hubs (MVP)
export const AU_ORIGINS = ['SYD', 'MEL', 'BNE', 'PER', 'ADL', 'CNS', 'DRW', 'OOL', 'CBR'];

// Southeast Asian hubs for positioning (from fullscope.md)
export const SEA_HUBS = ['DPS', 'CGK', 'SIN', 'KUL', 'HKT', 'MNL', 'BKK', 'SGN', 'HKG'];

// Major European destination hubs
export const EUR_HUBS = ['LHR', 'CDG', 'AMS', 'FRA', 'FCO', 'HEL', 'MAD', 'ZRH', 'MUC', 'BCN', 'VIE', 'CPH', 'OSL', 'ARN', 'ATH', 'IST', 'DUB', 'LIS', 'MXP'];

// Pacific positioning hubs (for AU → USA flights)
export const PACIFIC_HUBS = ['NAN', 'AKL', 'CHC'];

// North American destination hubs
export const US_HUBS = ['JFK', 'LAX', 'SFO', 'ORD', 'DFW', 'MIA', 'ATL', 'SEA', 'IAD', 'BOS', 'IAH', 'DEN', 'HNL', 'EWR', 'YVR', 'YYZ'];

// South American destination hubs
export const SAM_HUBS = ['GRU', 'EZE', 'SCL', 'BOG', 'LIM', 'GIG', 'PTY', 'MVD'];

// Asian destination hubs (for direct reward search)
export const ASIA_HUBS = ['NRT', 'HND', 'ICN', 'TPE', 'HKG', 'DEL', 'BOM', 'CMB', 'CAN', 'DXB', 'DOH'];

// Seats.aero source programs (from API docs)
export const SOURCES = {
    qantas: { key: 'qantas', name: 'Qantas Frequent Flyer', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: false, hasTripData: true },
    velocity: { key: 'velocity', name: 'Virgin Australia Velocity', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: true, hasTripData: true },
    // Additional programs for Step 1 direct reward searches
    emirates: { key: 'emirates', name: 'Emirates Skywards', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: false, hasTripData: true },
    singapore: { key: 'singapore', name: 'Singapore KrisFlyer', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: false, hasTripData: true },
    etihad: { key: 'etihad', name: 'Etihad Guest', cabins: ['Y', 'J', 'F'], hasSeatCount: true, hasTripData: true },
    american: { key: 'american', name: 'American Airlines', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: false, hasTripData: true },
    united: { key: 'united', name: 'United MileagePlus', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: true, hasTripData: true },
    alaska: { key: 'alaska', name: 'Alaska Mileage Plan', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: true, hasTripData: true },
    aeroplan: { key: 'aeroplan', name: 'Air Canada Aeroplan', cabins: ['Y', 'W', 'J', 'F'], hasSeatCount: true, hasTripData: true },
};

// Program grouping for user selection
export const PROGRAM_GROUPS = {
    qantas: ['qantas'],
    velocity: ['velocity'],
    both: ['qantas', 'velocity'],
    all: Object.keys(SOURCES),
};

// Cabin mapping
export const CABIN_MAP = {
    economy: 'Y',
    premium: 'W',
    business: 'J',
    first: 'F',
};

export const CABIN_LABELS = {
    Y: 'Economy',
    W: 'Premium Economy',
    J: 'Business',
    F: 'First',
};

// Cache configuration
export const CACHE_CONFIG = {
    ROUTE_TTL: 10 * 60 * 1000,      // 10 minutes for specific route searches
    REGION_TTL: 30 * 60 * 1000,     // 30 minutes for region-wide scans
    DAILY_LIMIT: 950,                // Hard stop (50 buffer from 1000)
};

// Search defaults
export const SEARCH_DEFAULTS = {
    MAX_RESULTS: 10,
    DATE_RANGE_DAYS: 2,              // ±2 days from selected date
    MAX_LAYOVER_HOURS: 36,
    MAX_STOPS_REWARD: 2,
    MAX_CASH_LEGS_STEP5: 1,
    MAX_CASH_LEGS_STEP6: 2,
};

// Logo.dev API key (publishable — safe for client-side)
export const LOGO_DEV_KEY = 'pk_JLc0pWxJRTGGD2TzN1VWRA';

// Airline IATA code → website domain (for logo.dev)
export const AIRLINE_DOMAINS = {
    QF: 'qantas.com',
    VA: 'virginaustralia.com',
    QR: 'qatarairways.com',
    EK: 'emirates.com',
    SQ: 'singaporeair.com',
    CX: 'cathaypacific.com',
    MH: 'malaysiaairlines.com',
    TG: 'thaiairways.com',
    GA: 'garuda-indonesia.com',
    JQ: 'jetstar.com',
    KL: 'klm.com',
    AF: 'airfrance.com',
    LH: 'lufthansa.com',
    BA: 'britishairways.com',
    AY: 'finnair.com',
    IB: 'iberia.com',
    SK: 'flysas.com',
    OS: 'austrian.com',
    LX: 'swiss.com',
    TK: 'turkishairlines.com',
    EY: 'etihad.com',
    AA: 'aa.com',
    UA: 'united.com',
    AS: 'alaskaair.com',
    AC: 'aircanada.com',
    NH: 'ana.co.jp',
    JL: 'jal.co.jp',
    KE: 'koreanair.com',
    OZ: 'flyasiana.com',
    AI: 'airindia.com',
    PR: 'philippineairlines.com',
    VN: 'vietnamairlines.com',
    CI: 'china-airlines.com',
    BR: 'evaair.com',
    FJ: 'fijiairways.com',
    NZ: 'airnewzealand.co.nz',
    LA: 'latam.com',
    TP: 'flytap.com',
    AZ: 'ita-airways.com',
    WY: 'omanair.com',
    RJ: 'rj.com',
    SV: 'saudia.com',
    GF: 'gulfair.com',
    UL: 'srilankan.com',
    '6E': 'goindigo.in',
    WS: 'westjet.com',
    DL: 'delta.com',
    '5J': 'cebupacificair.com',
    TR: 'flyscoot.com',
    '3K': 'jetstar.com',
    MS: 'egyptair.com',
    ET: 'ethiopianairlines.com',
    SA: 'flysaa.com',
    KQ: 'kenya-airways.com',
};

// Helper: get logo URL for an airline code
export function getAirlineLogoUrl(code) {
    const domain = AIRLINE_DOMAINS[code?.toUpperCase()];
    if (!domain) return null;
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}&size=64`;
}
