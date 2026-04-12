// @ts-nocheck
/**
 * Currency conversion for reward flight taxes.
 * The Seats.aero API returns taxes in the origin country's currency.
 * We need to convert to AUD for display.
 *
 * Rates are approximate and updated periodically.
 * Key: ISO currency code → value of 1 unit in AUD.
 */

// Airport IATA → currency code mapping (for common reward origins)
const AIRPORT_CURRENCY = {
    // Philippines
    MNL: 'PHP', CEB: 'PHP', DVO: 'PHP',
    // Malaysia
    KUL: 'MYR', PEN: 'MYR', BKI: 'MYR', KCH: 'MYR',
    // Singapore
    SIN: 'SGD',
    // Thailand
    BKK: 'THB', CNX: 'THB', HKT: 'THB',
    // Indonesia
    CGK: 'IDR', DPS: 'IDR', SUB: 'IDR',
    // India
    DEL: 'INR', BOM: 'INR', BLR: 'INR', MAA: 'INR', HYD: 'INR', CCU: 'INR',
    // Japan
    NRT: 'JPY', HND: 'JPY', KIX: 'JPY', NGO: 'JPY', FUK: 'JPY',
    // South Korea
    ICN: 'KRW', GMP: 'KRW',
    // China
    PVG: 'CNY', PEK: 'CNY', CAN: 'CNY', SZX: 'CNY', CTU: 'CNY',
    // Hong Kong
    HKG: 'HKD',
    // Taiwan
    TPE: 'TWD',
    // Vietnam
    SGN: 'VND', HAN: 'VND',
    // Sri Lanka
    CMB: 'LKR',
    // Qatar
    DOH: 'QAR',
    // UAE
    DXB: 'AED', AUH: 'AED',
    // Oman
    MCT: 'OMR',
    // Bahrain
    BAH: 'BHD',
    // Saudi Arabia
    RUH: 'SAR', JED: 'SAR',
    // UK
    LHR: 'GBP', LGW: 'GBP', MAN: 'GBP', EDI: 'GBP', STN: 'GBP',
    // Europe (EUR)
    CDG: 'EUR', AMS: 'EUR', FRA: 'EUR', FCO: 'EUR', MAD: 'EUR',
    BCN: 'EUR', MUC: 'EUR', VIE: 'EUR', BRU: 'EUR', DUB: 'EUR',
    LIS: 'EUR', ATH: 'EUR', HEL: 'EUR', OSL: 'EUR',
    // Switzerland
    ZRH: 'CHF', GVA: 'CHF',
    // Sweden / Denmark / Norway (use EUR approx)
    ARN: 'SEK', CPH: 'DKK',
    // South Africa
    JNB: 'ZAR', CPT: 'ZAR',
    // Kenya
    NBO: 'KES',
    // Ethiopia
    ADD: 'ETB',
    // Morocco
    CMN: 'MAD_CUR', // MAD currency code conflicts with Madrid airport
    // Egypt
    CAI: 'EGP',
    // Nigeria
    LOS: 'NGN',
    // USA / Canada
    JFK: 'USD', LAX: 'USD', SFO: 'USD', ORD: 'USD', DFW: 'USD',
    MIA: 'USD', ATL: 'USD', SEA: 'USD', IAD: 'USD', BOS: 'USD',
    IAH: 'USD', DEN: 'USD', HNL: 'USD', EWR: 'USD',
    YVR: 'CAD', YYZ: 'CAD', YUL: 'CAD', YYC: 'CAD',
    // Mexico
    MEX: 'MXN', CUN: 'MXN',
    // Brazil
    GRU: 'BRL', GIG: 'BRL',
    // Argentina
    EZE: 'ARS',
    // Chile
    SCL: 'CLP',
    // Colombia
    BOG: 'COP',
    // Peru
    LIM: 'PEN_CUR',
    // Fiji / NZ / Pacific
    NAN: 'FJD', SUV: 'FJD',
    AKL: 'NZD', CHC: 'NZD', ZQN: 'NZD', WLG: 'NZD',
    // Australia (no conversion needed)
    SYD: 'AUD', MEL: 'AUD', BNE: 'AUD', PER: 'AUD', ADL: 'AUD',
    CBR: 'AUD', OOL: 'AUD', CNS: 'AUD', DRW: 'AUD',
};

// Exchange rates: 1 unit of foreign currency = X AUD (approximate)
const TO_AUD_RATES = {
    AUD: 1,
    USD: 1.58,
    PHP: 0.0275,   // 1 PHP ≈ 0.0275 AUD — so 1874 PHP ≈ $51.54 AUD
    MYR: 0.35,
    SGD: 1.18,
    THB: 0.047,
    IDR: 0.0001,
    INR: 0.019,
    JPY: 0.011,
    KRW: 0.0012,
    CNY: 0.22,
    HKD: 0.20,
    TWD: 0.050,
    VND: 0.000064,
    LKR: 0.0053,
    QAR: 0.43,
    AED: 0.43,
    OMR: 4.10,
    BHD: 4.19,
    SAR: 0.42,
    GBP: 2.00,
    EUR: 1.72,
    CHF: 1.78,
    SEK: 0.15,
    DKK: 0.23,
    NOK: 0.15,
    ZAR: 0.088,
    KES: 0.012,
    ETB: 0.012,
    EGP: 0.032,
    NGN: 0.001,
    MAD_CUR: 0.16, // Moroccan Dirham
    CAD: 1.12,
    MXN: 0.092,
    BRL: 0.28,
    ARS: 0.0013,
    CLP: 0.0017,
    COP: 0.00039,
    PEN_CUR: 0.42, // Peruvian Sol
    FJD: 0.70,
    NZD: 0.90,
};

/**
 * Get the currency code for an airport
 * @param {string} airportCode - IATA airport code
 * @returns {string} Currency code (defaults to 'AUD')
 */
export function getAirportCurrency(airportCode) {
    return AIRPORT_CURRENCY[airportCode] || 'AUD';
}

/**
 * Convert an amount from a foreign currency to AUD.
 * @param {number} amount - Amount in the foreign currency
 * @param {string} fromCurrency - Currency code (e.g. 'PHP')
 * @returns {number} Amount in AUD, rounded to 2 decimal places
 */
export function convertToAUD(amount, fromCurrency) {
    if (!amount || fromCurrency === 'AUD') return amount;
    const rate = TO_AUD_RATES[fromCurrency];
    if (!rate) return amount; // Unknown currency, return as-is
    return Math.round(amount * rate * 100) / 100;
}

/**
 * Convert reward taxes from origin airport currency to AUD.
 * @param {number} taxAmount - Tax amount in origin currency
 * @param {string} originAirport - IATA origin airport code
 * @returns {number} Tax amount converted to AUD
 */
export function convertTaxToAUD(taxAmount, originAirport) {
    if (!taxAmount || !originAirport) return taxAmount;
    const currency = getAirportCurrency(originAirport);
    return convertToAUD(taxAmount, currency);
}
