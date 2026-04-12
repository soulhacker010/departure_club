// @ts-nocheck
// ══════════════════════════════════════════════
// CASH FARE ESTIMATES
// Distance-based pricing (no external API)
// ══════════════════════════════════════════════

import { AIRPORTS } from './airports';

/**
 * Haversine distance in km between two airports
 */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Rate per km by cabin class and route type
 * Short-haul (<3000km) is more expensive per km than long-haul
 * Rates calibrated against real AUD pricing from Google Flights
 */
const RATES = {
    Y: { short: 0.22, long: 0.10 },   // Economy
    W: { short: 0.32, long: 0.16 },   // Premium Economy
    J: { short: 0.55, long: 0.28 },   // Business
    F: { short: 0.80, long: 0.40 },   // First
};

/**
 * Known route-specific fare overrides (AUD)
 * For common cash positioning legs where we know approximate real pricing
 */
const ROUTE_OVERRIDES = {
    // EUR short-haul (calibrated from Google Flights AUD)
    'AMS-LHR': { Y: 155, W: 320, J: 550 },
    'LHR-AMS': { Y: 155, W: 320, J: 550 },
    'CDG-LHR': { Y: 140, W: 290, J: 500 },
    'LHR-CDG': { Y: 140, W: 290, J: 500 },
    'FRA-LHR': { Y: 160, W: 330, J: 560 },
    'LHR-FRA': { Y: 160, W: 330, J: 560 },
    'AMS-CDG': { Y: 120, W: 260, J: 450 },
    'CDG-AMS': { Y: 120, W: 260, J: 450 },
    // AU → SEA common routes
    'SYD-SIN': { Y: 550, W: 950, J: 2800 },
    'MEL-SIN': { Y: 530, W: 920, J: 2700 },
    'SYD-BKK': { Y: 600, W: 1050, J: 3000 },
    'SYD-DPS': { Y: 420, W: 750, J: 2200 },
    'PER-SIN': { Y: 380, W: 680, J: 2000 },
    'PER-KUL': { Y: 350, W: 620, J: 1800 },
    'PER-DPS': { Y: 300, W: 520, J: 1500 },
};

/**
 * Estimate cash fare for a route
 * @param {string} origin - Airport code
 * @param {string} destination - Airport code
 * @param {string} cabin - Y/W/J/F
 * @returns {{ price: number, currency: string, isEstimate: boolean, distanceKm: number }}
 */
export function estimateCashFare(origin, destination, cabin = 'Y') {
    const orig = AIRPORTS[origin];
    const dest = AIRPORTS[destination];

    if (!orig || !dest) {
        return { price: null, currency: 'AUD', isEstimate: true, distanceKm: null };
    }

    // Check for route-specific override first
    const routeKey = `${origin}-${destination}`;
    const override = ROUTE_OVERRIDES[routeKey];
    if (override && override[cabin]) {
        const distKm = haversineKm(orig.lat, orig.lng, dest.lat, dest.lng);
        return {
            price: override[cabin],
            currency: 'AUD',
            isEstimate: true,
            distanceKm: Math.round(distKm),
        };
    }

    const distKm = haversineKm(orig.lat, orig.lng, dest.lat, dest.lng);
    const rate = RATES[cabin] || RATES.Y;
    const perKm = distKm < 3000 ? rate.short : rate.long;

    // Base fare + distance component
    const baseFare = cabin === 'F' ? 200 : cabin === 'J' ? 120 : cabin === 'W' ? 70 : 45;
    const price = Math.round(baseFare + distKm * perKm);

    return {
        price,
        currency: 'AUD',
        isEstimate: true,
        distanceKm: Math.round(distKm),
    };
}

/**
 * Estimate flight duration in minutes based on distance
 */
export function estimateFlightMinutes(origin, destination) {
    const orig = AIRPORTS[origin];
    const dest = AIRPORTS[destination];

    if (!orig || !dest) return null;

    const distKm = haversineKm(orig.lat, orig.lng, dest.lat, dest.lng);
    // Average speed ~850 km/h + 30 min for taxi/takeoff/landing
    return Math.round(distKm / 850 * 60 + 30);
}

/**
 * Estimate duration for multi-stop flights via connection airports.
 * Sums individual leg flight times + 90 min minimum layover per connection.
 * Falls back to direct estimate if connections unknown.
 */
export function estimateMultiStopDuration(origin, destination, connections, stops) {
    // If no stops, use direct estimate
    if (!stops || stops === 0) return estimateFlightMinutes(origin, destination);

    // Parse connections string into array of airport codes
    let viaAirports = [];
    if (connections && typeof connections === 'string') {
        viaAirports = connections.split(/[,\s]+/).map(c => c.trim()).filter(c => c.length === 3);
    } else if (Array.isArray(connections)) {
        viaAirports = connections;
    }

    // If we know the via airports, calculate sum of segments
    if (viaAirports.length > 0) {
        const airports = [origin, ...viaAirports, destination];
        let totalMinutes = 0;
        for (let i = 0; i < airports.length - 1; i++) {
            const legDuration = estimateFlightMinutes(airports[i], airports[i + 1]);
            totalMinutes += legDuration || 120; // fallback 2h if unknown
        }
        // Add minimum layover per connection (90 min)
        totalMinutes += viaAirports.length * 90;
        return totalMinutes;
    }

    // No connection info: estimate as direct + extra for stops
    const directDuration = estimateFlightMinutes(origin, destination);
    if (!directDuration) return null;
    // Add ~2h per stop for routing overhead + layover
    return directDuration + (stops * 120);
}

/**
 * Format duration in minutes to "Xh Ym"
 */
export function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return 'N/A';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}
