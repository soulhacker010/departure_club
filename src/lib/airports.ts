// @ts-nocheck
// ══════════════════════════════════════════════
// AIRPORT DATABASE — Single Source of Truth
// All components import from here.
// Includes: code, city, country, lat, lng, region, utcOffset
// ══════════════════════════════════════════════

export const AIRPORTS = {
    // ─── Australian Departure Hubs (Section 3) ───
    SYD: { code: 'SYD', city: 'Sydney', country: 'Australia', lat: -33.9461, lng: 151.1772, region: 'Oceania', utc: 11 },
    MEL: { code: 'MEL', city: 'Melbourne', country: 'Australia', lat: -37.6733, lng: 144.8433, region: 'Oceania', utc: 11 },
    BNE: { code: 'BNE', city: 'Brisbane', country: 'Australia', lat: -27.3842, lng: 153.1175, region: 'Oceania', utc: 10 },
    PER: { code: 'PER', city: 'Perth', country: 'Australia', lat: -31.9403, lng: 115.9672, region: 'Oceania', utc: 8 },
    ADL: { code: 'ADL', city: 'Adelaide', country: 'Australia', lat: -34.9450, lng: 138.5306, region: 'Oceania', utc: 10.5 },
    CNS: { code: 'CNS', city: 'Cairns', country: 'Australia', lat: -16.8858, lng: 145.7553, region: 'Oceania', utc: 10 },
    DRW: { code: 'DRW', city: 'Darwin', country: 'Australia', lat: -12.4147, lng: 130.8772, region: 'Oceania', utc: 9.5 },
    OOL: { code: 'OOL', city: 'Gold Coast', country: 'Australia', lat: -28.1644, lng: 153.5047, region: 'Oceania', utc: 10 },
    CBR: { code: 'CBR', city: 'Canberra', country: 'Australia', lat: -35.3069, lng: 149.1953, region: 'Oceania', utc: 11 },

    // ─── Southeast Asian Hubs (Section 5 Step 3) ───
    SIN: { code: 'SIN', city: 'Singapore', country: 'Singapore', lat: 1.3502, lng: 103.9944, region: 'Asia', utc: 8 },
    BKK: { code: 'BKK', city: 'Bangkok', country: 'Thailand', lat: 13.6900, lng: 100.7501, region: 'Asia', utc: 7 },
    KUL: { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia', lat: 2.7456, lng: 101.7072, region: 'Asia', utc: 8 },
    CGK: { code: 'CGK', city: 'Jakarta', country: 'Indonesia', lat: -6.1256, lng: 106.6558, region: 'Asia', utc: 7 },
    DPS: { code: 'DPS', city: 'Bali', country: 'Indonesia', lat: -8.7482, lng: 115.1672, region: 'Asia', utc: 8 },
    MNL: { code: 'MNL', city: 'Manila', country: 'Philippines', lat: 14.5086, lng: 121.0197, region: 'Asia', utc: 8 },
    SGN: { code: 'SGN', city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8188, lng: 106.6519, region: 'Asia', utc: 7 },
    HKT: { code: 'HKT', city: 'Phuket', country: 'Thailand', lat: 8.1132, lng: 98.3169, region: 'Asia', utc: 7 },

    // ─── Middle East Hubs (common connections) ───
    DXB: { code: 'DXB', city: 'Dubai', country: 'UAE', lat: 25.2532, lng: 55.3657, region: 'Asia', utc: 4 },
    DOH: { code: 'DOH', city: 'Doha', country: 'Qatar', lat: 25.2731, lng: 51.6081, region: 'Asia', utc: 3 },
    AUH: { code: 'AUH', city: 'Abu Dhabi', country: 'UAE', lat: 24.4330, lng: 54.6511, region: 'Asia', utc: 4 },

    // ─── East Asian Connection Hubs ───
    HKG: { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3080, lng: 113.9185, region: 'Asia', utc: 8 },
    NRT: { code: 'NRT', city: 'Tokyo Narita', country: 'Japan', lat: 35.7720, lng: 140.3929, region: 'Asia', utc: 9 },
    HND: { code: 'HND', city: 'Tokyo Haneda', country: 'Japan', lat: 35.5533, lng: 139.7811, region: 'Asia', utc: 9 },
    ICN: { code: 'ICN', city: 'Seoul Incheon', country: 'South Korea', lat: 37.4602, lng: 126.4407, region: 'Asia', utc: 9 },
    TPE: { code: 'TPE', city: 'Taipei', country: 'Taiwan', lat: 25.0797, lng: 121.2342, region: 'Asia', utc: 8 },
    CAN: { code: 'CAN', city: 'Guangzhou', country: 'China', lat: 23.3924, lng: 113.2988, region: 'Asia', utc: 8 },
    DEL: { code: 'DEL', city: 'Delhi', country: 'India', lat: 28.5562, lng: 77.1000, region: 'Asia', utc: 5.5 },
    BOM: { code: 'BOM', city: 'Mumbai', country: 'India', lat: 19.0896, lng: 72.8656, region: 'Asia', utc: 5.5 },
    CMB: { code: 'CMB', city: 'Colombo', country: 'Sri Lanka', lat: 7.1824, lng: 79.8842, region: 'Asia', utc: 5.5 },

    // ─── European Destinations (expanded for full coverage) ───
    // United Kingdom & Ireland
    LHR: { code: 'LHR', city: 'London Heathrow', country: 'United Kingdom', lat: 51.4700, lng: -0.4543, region: 'Europe', utc: 0 },
    LGW: { code: 'LGW', city: 'London Gatwick', country: 'United Kingdom', lat: 51.1537, lng: -0.1821, region: 'Europe', utc: 0 },
    STN: { code: 'STN', city: 'London Stansted', country: 'United Kingdom', lat: 51.8850, lng: 0.2350, region: 'Europe', utc: 0 },
    MAN: { code: 'MAN', city: 'Manchester', country: 'United Kingdom', lat: 53.3537, lng: -2.2750, region: 'Europe', utc: 0 },
    EDI: { code: 'EDI', city: 'Edinburgh', country: 'United Kingdom', lat: 55.9508, lng: -3.3615, region: 'Europe', utc: 0 },
    BHX: { code: 'BHX', city: 'Birmingham', country: 'United Kingdom', lat: 52.4539, lng: -1.7480, region: 'Europe', utc: 0 },
    GLA: { code: 'GLA', city: 'Glasgow', country: 'United Kingdom', lat: 55.8719, lng: -4.4331, region: 'Europe', utc: 0 },
    DUB: { code: 'DUB', city: 'Dublin', country: 'Ireland', lat: 53.4264, lng: -6.2499, region: 'Europe', utc: 0 },
    // France
    CDG: { code: 'CDG', city: 'Paris CDG', country: 'France', lat: 49.0097, lng: 2.5479, region: 'Europe', utc: 1 },
    ORY: { code: 'ORY', city: 'Paris Orly', country: 'France', lat: 48.7233, lng: 2.3794, region: 'Europe', utc: 1 },
    NCE: { code: 'NCE', city: 'Nice', country: 'France', lat: 43.6584, lng: 7.2157, region: 'Europe', utc: 1 },
    LYS: { code: 'LYS', city: 'Lyon', country: 'France', lat: 45.7256, lng: 5.0811, region: 'Europe', utc: 1 },
    MRS: { code: 'MRS', city: 'Marseille', country: 'France', lat: 43.4393, lng: 5.2214, region: 'Europe', utc: 1 },
    // Germany
    FRA: { code: 'FRA', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lng: 8.5622, region: 'Europe', utc: 1 },
    MUC: { code: 'MUC', city: 'Munich', country: 'Germany', lat: 48.3538, lng: 11.7861, region: 'Europe', utc: 1 },
    BER: { code: 'BER', city: 'Berlin', country: 'Germany', lat: 52.3667, lng: 13.5033, region: 'Europe', utc: 1 },
    DUS: { code: 'DUS', city: 'Düsseldorf', country: 'Germany', lat: 51.2895, lng: 6.7668, region: 'Europe', utc: 1 },
    HAM: { code: 'HAM', city: 'Hamburg', country: 'Germany', lat: 53.6304, lng: 9.9882, region: 'Europe', utc: 1 },
    // Netherlands & Belgium
    AMS: { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lng: 4.7683, region: 'Europe', utc: 1 },
    BRU: { code: 'BRU', city: 'Brussels', country: 'Belgium', lat: 50.9014, lng: 4.4844, region: 'Europe', utc: 1 },
    // Iberian Peninsula
    MAD: { code: 'MAD', city: 'Madrid', country: 'Spain', lat: 40.4983, lng: -3.5676, region: 'Europe', utc: 1 },
    BCN: { code: 'BCN', city: 'Barcelona', country: 'Spain', lat: 41.2974, lng: 2.0833, region: 'Europe', utc: 1 },
    AGP: { code: 'AGP', city: 'Malaga', country: 'Spain', lat: 36.6749, lng: -4.4991, region: 'Europe', utc: 1 },
    LIS: { code: 'LIS', city: 'Lisbon', country: 'Portugal', lat: 38.7756, lng: -9.1354, region: 'Europe', utc: 0 },
    OPO: { code: 'OPO', city: 'Porto', country: 'Portugal', lat: 41.2481, lng: -8.6814, region: 'Europe', utc: 0 },
    // Italy
    FCO: { code: 'FCO', city: 'Rome Fiumicino', country: 'Italy', lat: 41.8003, lng: 12.2389, region: 'Europe', utc: 1 },
    MXP: { code: 'MXP', city: 'Milan Malpensa', country: 'Italy', lat: 45.6306, lng: 8.7281, region: 'Europe', utc: 1 },
    VCE: { code: 'VCE', city: 'Venice', country: 'Italy', lat: 45.5053, lng: 12.3519, region: 'Europe', utc: 1 },
    NAP: { code: 'NAP', city: 'Naples', country: 'Italy', lat: 40.8860, lng: 14.2908, region: 'Europe', utc: 1 },
    // Switzerland & Austria
    ZRH: { code: 'ZRH', city: 'Zurich', country: 'Switzerland', lat: 47.4647, lng: 8.5492, region: 'Europe', utc: 1 },
    GVA: { code: 'GVA', city: 'Geneva', country: 'Switzerland', lat: 46.2381, lng: 6.1089, region: 'Europe', utc: 1 },
    VIE: { code: 'VIE', city: 'Vienna', country: 'Austria', lat: 48.1103, lng: 16.5697, region: 'Europe', utc: 1 },
    // Scandinavia
    HEL: { code: 'HEL', city: 'Helsinki', country: 'Finland', lat: 60.3172, lng: 24.9633, region: 'Europe', utc: 2 },
    CPH: { code: 'CPH', city: 'Copenhagen', country: 'Denmark', lat: 55.6180, lng: 12.6508, region: 'Europe', utc: 1 },
    OSL: { code: 'OSL', city: 'Oslo', country: 'Norway', lat: 60.1976, lng: 11.1004, region: 'Europe', utc: 1 },
    ARN: { code: 'ARN', city: 'Stockholm', country: 'Sweden', lat: 59.6519, lng: 17.9186, region: 'Europe', utc: 1 },
    // Eastern Europe
    PRG: { code: 'PRG', city: 'Prague', country: 'Czech Republic', lat: 50.1008, lng: 14.2600, region: 'Europe', utc: 1 },
    WAW: { code: 'WAW', city: 'Warsaw', country: 'Poland', lat: 52.1657, lng: 20.9671, region: 'Europe', utc: 1 },
    KRK: { code: 'KRK', city: 'Krakow', country: 'Poland', lat: 50.0777, lng: 19.7848, region: 'Europe', utc: 1 },
    BUD: { code: 'BUD', city: 'Budapest', country: 'Hungary', lat: 47.4298, lng: 19.2611, region: 'Europe', utc: 1 },
    OTP: { code: 'OTP', city: 'Bucharest', country: 'Romania', lat: 44.5711, lng: 26.0850, region: 'Europe', utc: 2 },
    SOF: { code: 'SOF', city: 'Sofia', country: 'Bulgaria', lat: 42.6952, lng: 23.4062, region: 'Europe', utc: 2 },
    ZAG: { code: 'ZAG', city: 'Zagreb', country: 'Croatia', lat: 45.7429, lng: 16.0688, region: 'Europe', utc: 1 },
    // Greece & Turkey
    ATH: { code: 'ATH', city: 'Athens', country: 'Greece', lat: 37.9364, lng: 23.9445, region: 'Europe', utc: 2 },
    SKG: { code: 'SKG', city: 'Thessaloniki', country: 'Greece', lat: 40.5197, lng: 22.9709, region: 'Europe', utc: 2 },
    IST: { code: 'IST', city: 'Istanbul', country: 'Turkey', lat: 41.2753, lng: 28.7519, region: 'Europe', utc: 3 },

    // ─── New Zealand & Pacific ───
    AKL: { code: 'AKL', city: 'Auckland', country: 'New Zealand', lat: -37.0082, lng: 174.7850, region: 'Oceania', utc: 13 },
    WLG: { code: 'WLG', city: 'Wellington', country: 'New Zealand', lat: -41.3272, lng: 174.8050, region: 'Oceania', utc: 13 },
    CHC: { code: 'CHC', city: 'Christchurch', country: 'New Zealand', lat: -43.4894, lng: 172.5322, region: 'Oceania', utc: 13 },
    ZQN: { code: 'ZQN', city: 'Queenstown', country: 'New Zealand', lat: -45.0211, lng: 168.7392, region: 'Oceania', utc: 13 },
    NAN: { code: 'NAN', city: 'Nadi', country: 'Fiji', lat: -17.7554, lng: 177.4437, region: 'Oceania', utc: 12 },
    PPT: { code: 'PPT', city: 'Papeete', country: 'French Polynesia', lat: -17.5537, lng: -149.6072, region: 'Oceania', utc: -10 },
    APW: { code: 'APW', city: 'Apia', country: 'Samoa', lat: -13.8300, lng: -171.9978, region: 'Oceania', utc: 13 },
    NOU: { code: 'NOU', city: 'Noumea', country: 'New Caledonia', lat: -22.0146, lng: 166.2128, region: 'Oceania', utc: 11 },

    // ─── North America ───
    JFK: { code: 'JFK', city: 'New York JFK', country: 'United States', lat: 40.6413, lng: -73.7781, region: 'North America', utc: -5 },
    EWR: { code: 'EWR', city: 'Newark', country: 'United States', lat: 40.6895, lng: -74.1745, region: 'North America', utc: -5 },
    LAX: { code: 'LAX', city: 'Los Angeles', country: 'United States', lat: 33.9416, lng: -118.4085, region: 'North America', utc: -8 },
    SFO: { code: 'SFO', city: 'San Francisco', country: 'United States', lat: 37.6213, lng: -122.3790, region: 'North America', utc: -8 },
    ORD: { code: 'ORD', city: 'Chicago', country: 'United States', lat: 41.9742, lng: -87.9073, region: 'North America', utc: -6 },
    DFW: { code: 'DFW', city: 'Dallas', country: 'United States', lat: 32.8998, lng: -97.0403, region: 'North America', utc: -6 },
    MIA: { code: 'MIA', city: 'Miami', country: 'United States', lat: 25.7959, lng: -80.2870, region: 'North America', utc: -5 },
    ATL: { code: 'ATL', city: 'Atlanta', country: 'United States', lat: 33.6407, lng: -84.4277, region: 'North America', utc: -5 },
    SEA: { code: 'SEA', city: 'Seattle', country: 'United States', lat: 47.4502, lng: -122.3088, region: 'North America', utc: -8 },
    IAD: { code: 'IAD', city: 'Washington Dulles', country: 'United States', lat: 38.9531, lng: -77.4565, region: 'North America', utc: -5 },
    BOS: { code: 'BOS', city: 'Boston', country: 'United States', lat: 42.3656, lng: -71.0096, region: 'North America', utc: -5 },
    IAH: { code: 'IAH', city: 'Houston', country: 'United States', lat: 29.9902, lng: -95.3368, region: 'North America', utc: -6 },
    DEN: { code: 'DEN', city: 'Denver', country: 'United States', lat: 39.8561, lng: -104.6737, region: 'North America', utc: -7 },
    PHX: { code: 'PHX', city: 'Phoenix', country: 'United States', lat: 33.4373, lng: -112.0078, region: 'North America', utc: -7 },
    HNL: { code: 'HNL', city: 'Honolulu', country: 'United States', lat: 21.3187, lng: -157.9224, region: 'North America', utc: -10 },
    YVR: { code: 'YVR', city: 'Vancouver', country: 'Canada', lat: 49.1967, lng: -123.1815, region: 'North America', utc: -8 },
    YYZ: { code: 'YYZ', city: 'Toronto', country: 'Canada', lat: 43.6777, lng: -79.6248, region: 'North America', utc: -5 },
    YUL: { code: 'YUL', city: 'Montreal', country: 'Canada', lat: 45.4706, lng: -73.7408, region: 'North America', utc: -5 },
    YYC: { code: 'YYC', city: 'Calgary', country: 'Canada', lat: 51.1215, lng: -114.0076, region: 'North America', utc: -7 },
    MEX: { code: 'MEX', city: 'Mexico City', country: 'Mexico', lat: 19.4363, lng: -99.0721, region: 'North America', utc: -6 },
    CUN: { code: 'CUN', city: 'Cancun', country: 'Mexico', lat: 21.0365, lng: -86.8771, region: 'North America', utc: -5 },

    // ─── South America ───
    GRU: { code: 'GRU', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lng: -46.4731, region: 'South America', utc: -3 },
    GIG: { code: 'GIG', city: 'Rio de Janeiro', country: 'Brazil', lat: -22.8099, lng: -43.2506, region: 'South America', utc: -3 },
    EZE: { code: 'EZE', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lng: -58.5358, region: 'South America', utc: -3 },
    SCL: { code: 'SCL', city: 'Santiago', country: 'Chile', lat: -33.3930, lng: -70.7858, region: 'South America', utc: -4 },
    BOG: { code: 'BOG', city: 'Bogota', country: 'Colombia', lat: 4.7016, lng: -74.1469, region: 'South America', utc: -5 },
    LIM: { code: 'LIM', city: 'Lima', country: 'Peru', lat: -12.0219, lng: -77.1143, region: 'South America', utc: -5 },
    PTY: { code: 'PTY', city: 'Panama City', country: 'Panama', lat: 9.0714, lng: -79.3835, region: 'South America', utc: -5 },
    MVD: { code: 'MVD', city: 'Montevideo', country: 'Uruguay', lat: -34.8384, lng: -56.0308, region: 'South America', utc: -3 },

    // ─── Africa ───
    JNB: { code: 'JNB', city: 'Johannesburg', country: 'South Africa', lat: -26.1367, lng: 28.2464, region: 'Africa', utc: 2 },
    CPT: { code: 'CPT', city: 'Cape Town', country: 'South Africa', lat: -33.9649, lng: 18.6017, region: 'Africa', utc: 2 },
    NBO: { code: 'NBO', city: 'Nairobi', country: 'Kenya', lat: -1.3192, lng: 36.9278, region: 'Africa', utc: 3 },
    ADD: { code: 'ADD', city: 'Addis Ababa', country: 'Ethiopia', lat: 8.9779, lng: 38.7993, region: 'Africa', utc: 3 },
    CMN: { code: 'CMN', city: 'Casablanca', country: 'Morocco', lat: 33.3675, lng: -7.5898, region: 'Africa', utc: 1 },
    CAI: { code: 'CAI', city: 'Cairo', country: 'Egypt', lat: 30.1219, lng: 31.4056, region: 'Africa', utc: 2 },
    LOS: { code: 'LOS', city: 'Lagos', country: 'Nigeria', lat: 6.5774, lng: 3.3213, region: 'Africa', utc: 1 },
    ACC: { code: 'ACC', city: 'Accra', country: 'Ghana', lat: 5.6052, lng: -0.1668, region: 'Africa', utc: 0 },
    DAR: { code: 'DAR', city: 'Dar es Salaam', country: 'Tanzania', lat: -6.8781, lng: 39.2026, region: 'Africa', utc: 3 },
    MRU: { code: 'MRU', city: 'Mauritius', country: 'Mauritius', lat: -20.4302, lng: 57.6836, region: 'Africa', utc: 4 },
};

// ═══ Helper Functions ═══

/** Get all Australian departure hub codes */
export function getAUHubs() {
    return Object.values(AIRPORTS)
        .filter(a => a.region === 'Oceania')
        .map(a => ({ code: a.code, city: a.city }));
}

/** Get all airports (AU + EUR + SEA) with region info for bidirectional search */
export function getAllAirports() {
    return Object.values(AIRPORTS)
        .sort((a, b) => a.city.localeCompare(b.city))
        .map(a => ({ code: a.code, city: a.city, country: a.country, region: a.region }));
}

/** Get all European destination codes with city names */
export function getEuropeanDestinations() {
    return Object.values(AIRPORTS)
        .filter(a => a.region === 'Europe')
        .sort((a, b) => a.city.localeCompare(b.city))
        .map(a => ({ code: a.code, city: a.city, country: a.country }));
}

/** Get European airport codes (flat list) */
export function getEuropeanAirports() {
    return Object.values(AIRPORTS)
        .filter(a => a.region === 'Europe')
        .map(a => a.code);
}

/** Get SEA hub codes from fullscope.md Section 5 */
export function getSEAHubs() {
    return ['DPS', 'CGK', 'SIN', 'KUL', 'HKT', 'MNL', 'BKK', 'SGN'];
}

/** Get coordinates for an airport code */
export function getCoords(code) {
    const a = AIRPORTS[code];
    return a ? [a.lat, a.lng] : null;
}

/** Get airport info (safe — returns fallback for unknown codes) */
export function getAirport(code) {
    return AIRPORTS[code] || { code, city: code, country: '', lat: 0, lng: 0, region: '', utc: 0 };
}

/** Get UTC offset for an airport */
export function getUtcOffset(code) {
    return AIRPORTS[code]?.utc ?? 0;
}

/**
 * Calculate timezone-normalised layover between two airports
 * @param {string} arrivalAirport - IATA code of arrival airport
 * @param {Date|string} arrivalTime - Arrival time (local)
 * @param {string} departureAirport - IATA code of departure airport
 * @param {Date|string} departureTime - Departure time (local)
 * @returns {number} Layover in minutes (timezone-adjusted)
 */
export function calculateLayover(arrivalAirport, arrivalTime, departureAirport, departureTime) {
    const arrUtc = getUtcOffset(arrivalAirport);
    const depUtc = getUtcOffset(departureAirport);

    const arrDate = new Date(arrivalTime);
    const depDate = new Date(departureTime);

    // Convert both to UTC, then diff
    const arrUTC = arrDate.getTime() - (arrUtc * 60 * 60 * 1000);
    const depUTC = depDate.getTime() - (depUtc * 60 * 60 * 1000);

    return Math.round((depUTC - arrUTC) / (1000 * 60));
}
