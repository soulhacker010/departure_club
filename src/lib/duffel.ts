// @ts-nocheck
// ══════════════════════════════════════════════
// DUFFEL API CLIENT
// Real cash fare pricing + flight times for positioning legs
// Server-side only
// ══════════════════════════════════════════════

import { cacheGet, cacheSet, cacheKey } from './cache';
import { convertToAUD } from './currencyConvert';

const DUFFEL_BASE = 'https://api.duffel.com';
const DUFFEL_TTL = 30 * 60 * 1000; // 30 min — cash fares don't change that fast

// Max unique cash routes to enrich per search — protects API credits
const MAX_ENRICH = 10;

// Cabin code → Duffel cabin_class value
const CABIN_MAP = {
    Y: 'economy',
    W: 'premium_economy',
    J: 'business',
    F: 'first',
};

function getDuffelKey() {
    return process.env.DUFFEL_API_KEY || null;
}

function buildHeaders() {
    return {
        'Authorization': `Bearer ${getDuffelKey()}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
}

/**
 * Search for the cheapest one-way cash fare via Duffel.
 * Returns null on any error so the caller falls back to existing estimates.
 *
 * @param {string} origin      - IATA airport code e.g. "SYD"
 * @param {string} destination - IATA airport code e.g. "SIN"
 * @param {string} date        - Departure date "YYYY-MM-DD"
 * @param {string} cabin       - Cabin code Y/W/J/F
 * @returns {{ price: number, currency: string, isEstimate: false, departureTime: string|null, arrivalTime: string|null } | null}
 */
export async function searchCashFare(origin, destination, date, cabin = 'Y') {
    const key = getDuffelKey();
    if (!key) return null;
    if (!origin || !destination || !date) return null;

    const cabinClass = CABIN_MAP[cabin] || 'economy';
    const ck = cacheKey('duffel', { origin, destination, date, cabin: cabinClass });

    const cached = cacheGet(ck);
    if (cached !== null) return cached;

    try {
        const res = await fetch(
            `${DUFFEL_BASE}/air/offer_requests?return_offers=true`,
            {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify({
                    data: {
                        slices: [{
                            origin,
                            destination,
                            departure_date: date,
                        }],
                        passengers: [{ type: 'adult' }],
                        cabin_class: cabinClass,
                    },
                }),
                signal: AbortSignal.timeout(6000), // 6s hard timeout — keeps total search time reasonable
            }
        );

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.warn(`Duffel ${origin}→${destination}: HTTP ${res.status}`, errBody);
            return null;
        }

        const json = await res.json();
        const offers = json?.data?.offers;

        if (!Array.isArray(offers) || offers.length === 0) {
            cacheSet(ck, null, DUFFEL_TTL); // Cache empty so we don't keep retrying
            return null;
        }

        // Sort ascending by price, pick cheapest
        const sorted = offers
            .filter(o => o.total_amount && o.total_currency)
            .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));

        if (sorted.length === 0) return null;

        const cheapest = sorted[0];

        // Pull departure/arrival from first slice segments
        const segments = cheapest.slices?.[0]?.segments || [];
        const departureTime = segments[0]?.departing_at || null;
        const arrivalTime = segments[segments.length - 1]?.arriving_at || null;

        // Convert to AUD
        const rawPrice = parseFloat(cheapest.total_amount);
        const priceAUD = convertToAUD(rawPrice, cheapest.total_currency);

        const result = {
            price: Math.round(priceAUD),
            currency: 'AUD',
            isEstimate: false,
            departureTime,
            arrivalTime,
        };

        cacheSet(ck, result, DUFFEL_TTL);
        return result;

    } catch (err) {
        // Silently fail — cascade keeps existing estimates
        console.warn(`Duffel fetch failed ${origin}→${destination} ${date}:`, err?.message);
        return null;
    }
}

/**
 * Enrich cash legs on routes with real Duffel prices and departure/arrival times.
 *
 * Rules:
 * - Only touches legs where isCash === true
 * - Never modifies reward legs
 * - Caps at MAX_ENRICH unique route combos to protect API credits
 * - If Duffel returns null for a leg, that leg keeps its existing estimate — nothing breaks
 * - Recalculates route.totalCash after enrichment
 *
 * @param {Array} routes - Route objects from cascadeSearch()
 * @returns {Promise<Array>} Same routes array, mutated in place
 */
export async function enrichCashLegs(routes) {
    if (!getDuffelKey()) return routes;
    if (!Array.isArray(routes) || routes.length === 0) return routes;

    // Collect unique (origin|destination|date|cabin) combos from cash legs
    const seen = new Set();
    const tasks = [];

    for (const route of routes) {
        if (!Array.isArray(route.legs)) continue;
        for (const leg of route.legs) {
            if (!leg.isCash) continue;
            // Cash legs built in Steps 4-6 don't carry their own date — fall back to route.date
            const legDate = leg.date || route.date;
            if (!legDate || !leg.origin || !leg.destination) continue;
            const ck = `${leg.origin}|${leg.destination}|${legDate}|${leg.cabin}`;
            if (seen.has(ck)) continue;
            if (seen.size >= MAX_ENRICH) break;
            seen.add(ck);
            tasks.push({
                cacheKey: ck,
                origin: leg.origin,
                destination: leg.destination,
                date: legDate,
                cabin: leg.cabin,
            });
        }
        if (seen.size >= MAX_ENRICH) break;
    }

    if (tasks.length === 0) return routes;

    // Fetch all in parallel
    const fetched = await Promise.all(
        tasks.map(t =>
            searchCashFare(t.origin, t.destination, t.date, t.cabin)
                .then(data => ({ ck: t.cacheKey, data }))
        )
    );

    // Build lookup: "SYD|SIN|2026-06-02|Y" → duffel result
    const lookup = {};
    for (const { ck, data } of fetched) {
        if (data) lookup[ck] = data;
    }

    if (Object.keys(lookup).length === 0) return routes;

    // Apply Duffel data to matching cash legs
    for (const route of routes) {
        if (!Array.isArray(route.legs)) continue;
        let updatedCash = false;

        for (const leg of route.legs) {
            if (!leg.isCash) continue;
            const legDate = leg.date || route.date;
            const ck = `${leg.origin}|${leg.destination}|${legDate}|${leg.cabin}`;
            const duffel = lookup[ck];
            if (!duffel) continue;

            if (duffel.price) leg.estimatedPrice = duffel.price;
            if (duffel.departureTime) leg.departureTime = duffel.departureTime;
            if (duffel.arrivalTime) leg.arrivalTime = duffel.arrivalTime;
            leg.isEstimate = false; // Remove ~ from UI — this is now a real price
            updatedCash = true;
        }

        // Recalculate totalCash from the now-updated legs
        if (updatedCash) {
            route.totalCash = route.legs
                .filter(l => l.isCash)
                .reduce((sum, l) => sum + (l.estimatedPrice || 0), 0);
        }
    }

    return routes;
}
