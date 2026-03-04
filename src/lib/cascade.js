// ══════════════════════════════════════════════
// 6-STEP CASCADE SEARCH ENGINE
// Core routing logic from fullscope.md Section 5
// ══════════════════════════════════════════════

import { cachedSearch, getTrips } from './seatsAero.js';
import { cacheGet, cacheSet, cacheKey, trackApiCall } from './cache.js';
import { getPositioningCabins, getSegmentLabel } from './cabinRules.js';
import { estimateCashFare, estimateFlightMinutes, estimateMultiStopDuration, formatDuration } from './cashEstimate.js';
import { rankRoutes, rewardPercentage } from './scoring.js';
import { AIRPORTS, getAirport, getSEAHubs } from './airports.js';
import { CACHE_CONFIG, CABIN_MAP, CABIN_LABELS, SEA_HUBS, EUR_HUBS, PACIFIC_HUBS, US_HUBS, SAM_HUBS, ASIA_HUBS, SEARCH_DEFAULTS } from './constants.js';
import { convertTaxToAUD } from './currencyConvert.js';

/**
 * Main entry point — runs the 6-step cascade search
 *
 * @param {object} params
 * @param {string} params.origin - AU airport code
 * @param {string} params.destination - EUR airport code
 * @param {string} params.date - YYYY-MM-DD
 * @param {string} params.cabin - economy|premium|business|first
 * @param {string} params.program - qantas|velocity|both|all
 * @param {boolean} params.hybridEnabled - Include hybrid results
 * @param {string} params.stops - any|direct|1|2
 * @param {number} params.passengers - 1-9
 * @param {object} [params.cabinOverrides] - User cabin positioning overrides
 * @returns {Promise<{ results: Array, meta: object }>}
 */
export async function cascadeSearch(params) {
    const {
        origin,
        destination,
        date,
        endDate,
        cabin = 'business',
        program = 'both',
        hybridEnabled = true,
        stops = 'any',
        passengers = 1,
        cabinOverrides = null,
    } = params;

    const cabinCode = CABIN_MAP[cabin] || 'J';
    const sources = getSources(program);
    const dateRange = getDateRange(date, endDate);
    const destRegion = getDestRegion(destination);

    const allResults = [];
    const meta = { steps: [], apiCalls: 0, fromCache: 0 };

    // ═══ STEP 1: Direct Reward Search ═══
    try {
        const step1 = await searchDirectReward(origin, destination, dateRange, cabinCode, sources);
        meta.steps.push({ step: 1, name: 'Direct Reward', results: step1.results.length, apiCalls: step1.apiCalls, cached: step1.cached });
        meta.apiCalls += step1.apiCalls;
        meta.fromCache += step1.cached;
        allResults.push(...step1.results);
    } catch (e) {
        meta.steps.push({ step: 1, name: 'Direct Reward', error: e.message });
    }

    // ═══ STEP 2: Reward With Stops ═══
    if (stops !== 'direct') {
        try {
            const maxStops = stops === '1' ? 1 : stops === '2' ? 2 : 2;
            const step2 = await searchRewardWithStops(origin, destination, dateRange, cabinCode, sources, maxStops);
            meta.steps.push({ step: 2, name: 'Reward With Stops', results: step2.results.length, apiCalls: step2.apiCalls, cached: step2.cached });
            meta.apiCalls += step2.apiCalls;
            meta.fromCache += step2.cached;
            allResults.push(...step2.results);
        } catch (e) {
            meta.steps.push({ step: 2, name: 'Reward With Stops', error: e.message });
        }
    }

    // ═══ STEP 3: SEA Hub → Destination (reward) + AUS → SEA positioning ═══
    // Always runs — these are pure reward routes, not hybrid
    if (stops !== 'direct') {
        try {
            const step3 = await searchSEAToDestination(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: 3, name: 'SEA Hub Reward', results: step3.results.length, apiCalls: step3.apiCalls, cached: step3.cached });
            meta.apiCalls += step3.apiCalls;
            meta.fromCache += step3.cached;
            allResults.push(...step3.results);
        } catch (e) {
            meta.steps.push({ step: 3, name: 'SEA Hub Reward', error: e.message });
        }
    }

    // ═══ STEP 4: SEA → EUR Hub Strategy ═══
    // Always runs — these are pure reward routes, not hybrid
    if (stops !== 'direct') {
        try {
            const step4 = await searchSEAToEurHub(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: 4, name: 'SEA → EUR Hub', results: step4.results.length, apiCalls: step4.apiCalls, cached: step4.cached });
            meta.apiCalls += step4.apiCalls;
            meta.fromCache += step4.cached;
            allResults.push(...step4.results);
        } catch (e) {
            meta.steps.push({ step: 4, name: 'SEA → EUR Hub', error: e.message });
        }
    }

    // ═══ STEP 5: Cash Positioning (1 Leg) ═══
    if (hybridEnabled) {
        try {
            const step5 = await searchCashPositioning1Leg(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: 5, name: 'Cash + Reward (1 cash leg)', results: step5.results.length, apiCalls: step5.apiCalls, cached: step5.cached });
            meta.apiCalls += step5.apiCalls;
            meta.fromCache += step5.cached;
            allResults.push(...step5.results);
        } catch (e) {
            meta.steps.push({ step: 5, name: 'Cash + Reward (1 cash leg)', error: e.message });
        }
    }

    // ═══ STEP 6: Cash Positioning (2 Legs) ═══
    if (hybridEnabled && allResults.filter(r => r.type === 'hybrid-1-cash').length === 0) {
        try {
            const step6 = await searchCashPositioning2Legs(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: 6, name: 'Cash + Reward (2 cash legs)', results: step6.results.length, apiCalls: step6.apiCalls, cached: step6.cached });
            meta.apiCalls += step6.apiCalls;
            meta.fromCache += step6.cached;
            allResults.push(...step6.results);
        } catch (e) {
            meta.steps.push({ step: 6, name: 'Cash + Reward (2 cash legs)', error: e.message });
        }
    }

    // ═══ STEP 7: EUR Hub Extension (cash last-mile) ═══
    // If destination is not a major EUR hub with direct reward from SEA, find reward
    // flights to nearby EUR hubs and add a cash hop from that hub to final destination.
    // Example: PER→BKK(cash) + BKK→CDG(reward) + CDG→CPH(cash)
    if (hybridEnabled && destRegion === 'Europe') {
        try {
            const step7 = await searchEurHubExtension(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: 7, name: 'EUR Hub Extension (cash last-mile)', results: step7.results.length, apiCalls: step7.apiCalls, cached: step7.cached });
            meta.apiCalls += step7.apiCalls;
            meta.fromCache += step7.cached;
            allResults.push(...step7.results);
        } catch (e) {
            meta.steps.push({ step: 7, name: 'EUR Hub Extension (cash last-mile)', error: e.message });
        }
    }

    // ═══ STEP 8: Pacific Hub → North America (reward positioning) ═══
    if (destRegion === 'North America' && stops !== 'direct') {
        try {
            const step8 = await searchPacificToUSA(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: 8, name: 'Pacific Hub → USA Reward', results: step8.results.length, apiCalls: step8.apiCalls, cached: step8.cached });
            meta.apiCalls += step8.apiCalls;
            meta.fromCache += step8.cached;
            allResults.push(...step8.results);
        } catch (e) {
            meta.steps.push({ step: 8, name: 'Pacific Hub → USA Reward', error: e.message });
        }
    }

    // ═══ STEP 8b: Cash AU → Pacific + Reward Pacific → USA (hybrid) ═══
    if (hybridEnabled && destRegion === 'North America') {
        try {
            const step8b = await searchCashPacificToUSA(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: '8b', name: 'Cash Pacific → USA Hybrid', results: step8b.results.length, apiCalls: step8b.apiCalls, cached: step8b.cached });
            meta.apiCalls += step8b.apiCalls;
            meta.fromCache += step8b.cached;
            allResults.push(...step8b.results);
        } catch (e) {
            meta.steps.push({ step: '8b', name: 'Cash Pacific → USA Hybrid', error: e.message });
        }
    }

    // ═══ STEP 9: SEA Hub → Global (SAM, Asia, Africa) reward positioning ═══
    if ((destRegion === 'South America' || destRegion === 'Africa' || (destRegion === 'Asia' && !SEA_HUBS.includes(destination))) && stops !== 'direct') {
        try {
            const step9 = await searchSEAToGlobalDest(origin, destination, dateRange, cabinCode, sources, cabinOverrides, `SEA → ${destRegion}`);
            meta.steps.push({ step: 9, name: `SEA Hub → ${destRegion} Reward`, results: step9.results.length, apiCalls: step9.apiCalls, cached: step9.cached });
            meta.apiCalls += step9.apiCalls;
            meta.fromCache += step9.cached;
            allResults.push(...step9.results);
        } catch (e) {
            meta.steps.push({ step: 9, name: `SEA Hub → ${destRegion} Reward`, error: e.message });
        }
    }

    // ═══ STEP 9b: Cash AU → SEA + Reward SEA → Global (hybrid) ═══
    if (hybridEnabled && (destRegion === 'South America' || destRegion === 'Africa' || (destRegion === 'Asia' && !SEA_HUBS.includes(destination)))) {
        try {
            const step9b = await searchCashSEAToGlobalDest(origin, destination, dateRange, cabinCode, sources, cabinOverrides);
            meta.steps.push({ step: '9b', name: `Cash SEA → ${destRegion} Hybrid`, results: step9b.results.length, apiCalls: step9b.apiCalls, cached: step9b.cached });
            meta.apiCalls += step9b.apiCalls;
            meta.fromCache += step9b.cached;
            allResults.push(...step9b.results);
        } catch (e) {
            meta.steps.push({ step: '9b', name: `Cash SEA → ${destRegion} Hybrid`, error: e.message });
        }
    }

    // ═══ HYBRID FALLBACK: Generate hybrids from reward-positioning routes ═══
    if (hybridEnabled && allResults.filter(r => r.type.startsWith('hybrid')).length === 0) {
        const posRoutes = allResults.filter(r =>
            r.type === 'reward-positioning' && r.legs?.length >= 2 && !r.legs[0]?.isMainLeg
        );
        const posCabins = getPositioningCabins(cabinCode, cabinOverrides);
        const cashCabinsToTry = ['Y', 'W']; // Economy + Premium Economy variants
        let hybridCount = 0;

        for (const route of posRoutes) {
            if (hybridCount >= 10) break;

            // Try swapping FIRST leg to cash (positioning → cash)
            for (const cashCabin of cashCabinsToTry) {
                if (hybridCount >= 10) break;
                const firstLeg = route.legs[0];
                const cashFare = estimateCashFare(firstLeg.origin, firstLeg.destination, cashCabin);
                const hybridLegs = route.legs.map((leg, i) => {
                    if (i === 0) {
                        return {
                            ...leg,
                            isReward: false,
                            isCash: true,
                            isMainLeg: false,
                            cabin: cashCabin,
                            label: getSegmentLabel(cashCabin, false),
                            points: 0,
                            estimatedPrice: cashFare.price,
                            currency: cashFare.currency,
                            isEstimate: true,
                        };
                    }
                    return { ...leg };
                });

                const hybridRoute = {
                    ...route,
                    id: undefined, // Force new ID for dedup
                    type: 'hybrid-1-cash',
                    legs: hybridLegs,
                    totalPoints: hybridLegs.filter(l => !l.isCash).reduce((s, l) => s + (l.points || 0), 0),
                    totalCash: cashFare.price || 0,
                    rewardPercent: 0,
                };
                hybridRoute.rewardPercent = rewardPercentage(hybridRoute);
                allResults.push(hybridRoute);
                hybridCount++;
            }

            // Try swapping LAST leg to cash (if 3+ legs)
            if (route.legs.length >= 3) {
                for (const cashCabin of cashCabinsToTry) {
                    if (hybridCount >= 10) break;
                    const lastLeg = route.legs[route.legs.length - 1];
                    const cashFare = estimateCashFare(lastLeg.origin, lastLeg.destination, cashCabin);
                    const hybridLegs = route.legs.map((leg, i) => {
                        if (i === route.legs.length - 1) {
                            return {
                                ...leg,
                                isReward: false,
                                isCash: true,
                                isMainLeg: false,
                                cabin: cashCabin,
                                label: getSegmentLabel(cashCabin, false),
                                points: 0,
                                estimatedPrice: cashFare.price,
                                currency: cashFare.currency,
                                isEstimate: true,
                            };
                        }
                        return { ...leg };
                    });

                    const hybridRoute = {
                        ...route,
                        id: undefined,
                        type: 'hybrid-1-cash',
                        legs: hybridLegs,
                        totalPoints: hybridLegs.filter(l => !l.isCash).reduce((s, l) => s + (l.points || 0), 0),
                        totalCash: cashFare.price || 0,
                        rewardPercent: 0,
                    };
                    hybridRoute.rewardPercent = rewardPercentage(hybridRoute);
                    allResults.push(hybridRoute);
                    hybridCount++;
                }
            }
        }
        meta.steps.push({ step: '5b', name: 'Hybrid Fallback (from positioning)', results: hybridCount });
    }

    // ═══ Deduplicate, validate, rank ═══
    const deduped = deduplicateResults(allResults);
    const validated = hybridEnabled ? deduped : deduped.filter(r => !r.type.startsWith('hybrid'));

    // Validate hybrid results (reward must be majority of flight time)
    const hybridValidated = validated.filter(r => {
        if (r.type.startsWith('hybrid')) {
            return rewardPercentage(r) > 50;
        }
        return true;
    });

    // ═══ FIX #11: Airline filtering — exclude Qatar (QR) Business reward ═══
    // QR Economy is allowed, but QR Business/First reward flights are filtered out
    const airlineFiltered = hybridValidated.filter(route => {
        if (!route.legs) return true;
        return !route.legs.some(leg =>
            leg.isReward &&
            (leg.cabin === 'J' || leg.cabin === 'F') &&
            leg.airlines &&
            leg.airlines.split(',').some(a => a.trim().toUpperCase() === 'QR')
        );
    });

    // ═══ FIX #12: Remove 0-point ghost flights ═══
    // If a reward leg has 0 points, it's invalid/ghost data — remove the entire route
    const ghostFiltered = airlineFiltered.filter(route => {
        if (!route.legs) return true;
        const hasGhostLeg = route.legs.some(leg =>
            leg.isReward && (leg.points === 0 || leg.points === null || leg.points === undefined)
        );
        return !hasGhostLeg;
    });

    // ═══ FIX #4: Anchor route.date to FIRST DEPARTURE, not reward date ═══
    // Set route.date to legs[0].date (when user actually departs)
    for (const route of ghostFiltered) {
        if (route.legs?.length > 0 && route.legs[0].date) {
            route.date = route.legs[0].date;
        }
    }

    // ═══ FIX #7: Strict chronological validation ═══
    // Reject any route where a leg departs BEFORE the previous leg
    const chronoValid = ghostFiltered.filter(route => {
        if (!route.legs || route.legs.length < 2) return true;
        for (let i = 1; i < route.legs.length; i++) {
            const prevDate = route.legs[i - 1].date;
            const currDate = route.legs[i].date;
            if (prevDate && currDate && new Date(currDate) < new Date(prevDate)) {
                return false; // Backwards date = impossible route
            }
        }
        return true;
    });

    // ═══ FIX #13: Date window — check REWARD leg date, not positioning leg ═══
    // The user is searching for reward availability on a particular date.
    // Positioning legs can depart earlier (to get to the hub), so we filter
    // based on the first REWARD leg's date, not route.date (first departure).
    const windowStart = new Date(dateRange.start);
    const windowEnd = new Date(dateRange.end);
    const dateFiltered = chronoValid.filter(r => {
        if (!r.legs || r.legs.length === 0) return true;

        // Find the first reward leg's date — that's what the user searched for
        const rewardLeg = r.legs.find(leg => leg.isReward && leg.date);
        const checkDate = rewardLeg ? rewardLeg.date : r.date;

        if (!checkDate) return true;
        const depDate = new Date(checkDate);
        return depDate >= windowStart && depDate <= windowEnd;
    });

    const ranked = rankRoutes(dateFiltered, date);

    return {
        results: ranked,
        meta: {
            ...meta,
            totalResults: ranked.length,
            fetchedAt: new Date().toISOString(),
            query: { origin, destination, date, cabin, program, hybridEnabled, stops },
        },
    };
}

// ═══════════════════════════════════════════════
// STEP IMPLEMENTATIONS
// ═══════════════════════════════════════════════

/**
 * Step 1: Direct reward flights AUS → EUR
 */
async function searchDirectReward(origin, dest, dateRange, cabin, sources) {
    const ckey = cacheKey('step1', { origin, dest, ...dateRange, cabin, sources });
    const cached = cacheGet(ckey);
    if (cached) return { results: cached, apiCalls: 0, cached: 1 };

    if (!trackApiCall()) return { results: [], apiCalls: 0, cached: 0 };

    const data = await cachedSearch({
        origin,
        destination: dest,
        startDate: dateRange.start,
        endDate: dateRange.end,
        cabin: cabinToApiCabin(cabin),
        sources,
        directOnly: true,
        take: 200,
    });

    const results = data.map(avail => buildRewardResult(avail, 'direct-reward', origin, dest, cabin));
    cacheSet(ckey, results, CACHE_CONFIG.ROUTE_TTL);
    return { results, apiCalls: 1, cached: 0 };
}

/**
 * Step 2: Reward with stops (reuses Step 1 data + includes connecting flights)
 */
async function searchRewardWithStops(origin, dest, dateRange, cabin, sources, maxStops) {
    const ckey = cacheKey('step2', { origin, dest, ...dateRange, cabin, sources, maxStops });
    const cached = cacheGet(ckey);
    if (cached) return { results: cached, apiCalls: 0, cached: 1 };

    if (!trackApiCall()) return { results: [], apiCalls: 0, cached: 0 };

    const data = await cachedSearch({
        origin,
        destination: dest,
        startDate: dateRange.start,
        endDate: dateRange.end,
        cabin: cabinToApiCabin(cabin),
        sources,
        directOnly: false,
        take: 300,
    });

    const results = [];
    for (const avail of data) {
        // Get trip details to check stop count
        const trips = avail.Trips || [];
        if (trips.length === 0) {
            // If no trip data available, build from availability
            const result = buildRewardResult(avail, 'reward-with-stops', origin, dest, cabin);
            results.push(result);
            continue;
        }

        for (const trip of trips) {
            if ((trip.Stops || 0) <= maxStops && (trip.Stops || 0) > 0) {
                results.push(buildTripResult(trip, avail, 'reward-with-stops', cabin));
            }
        }
    }

    cacheSet(ckey, results, CACHE_CONFIG.ROUTE_TTL);
    return { results, apiCalls: 1, cached: 0 };
}

/**
 * Step 3: Search SEA hubs → final destination + position AUS → SEA
 */
async function searchSEAToDestination(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    const ckey = cacheKey('step3', { origin, dest, ...dateRange, cabin, sources });
    const cached = cacheGet(ckey);
    if (cached) return { results: cached, apiCalls: 0, cached: 1 };

    const seaHubs = getSEAHubs();
    const positioningCabins = getPositioningCabins(cabin, cabinOverrides);
    const results = [];
    let apiCalls = 0;

    // Search each SEA hub → destination
    for (const hub of seaHubs) {
        const hubKey = cacheKey('sea-dest', { hub, dest, ...dateRange, cabin, sources });
        let seaToDestData = cacheGet(hubKey);

        if (!seaToDestData) {
            if (!trackApiCall()) continue;
            try {
                seaToDestData = await cachedSearch({
                    origin: hub,
                    destination: dest,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 100,
                });
                cacheSet(hubKey, seaToDestData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!seaToDestData || seaToDestData.length === 0) continue;

        // Found reward SEA → dest, now search positioning AUS → SEA
        const posKey = cacheKey('pos-aus-sea', { origin, hub, ...dateRange, sources });
        let posData = cacheGet(posKey);

        if (!posData) {
            if (!trackApiCall()) continue;
            try {
                const posCabins = positioningCabins.rewardPositioning.map(c => cabinToApiCabin(c)).join(',');
                posData = await cachedSearch({
                    origin,
                    destination: hub,
                    startDate: dateRange.start, // Anchor to user's search window
                    endDate: dateRange.end,
                    cabin: posCabins,
                    sources,
                    take: 100,
                });
                cacheSet(posKey, posData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!posData || posData.length === 0) continue;

        // Combine: AUS → SEA (positioning) + SEA → dest (main)
        // FIX #13: Ensure positioning leg date <= main leg date
        for (const mainFlight of seaToDestData.slice(0, 5)) {
            for (const posFlight of posData.slice(0, 3)) {
                // Date check: positioning must depart on or before main leg
                const posDate = posFlight.Date ? new Date(posFlight.Date) : null;
                const mainDate = mainFlight.Date ? new Date(mainFlight.Date) : null;
                if (posDate && mainDate && mainDate < posDate) continue; // Skip backwards

                const layoverOk = checkLayover(posFlight, mainFlight, hub);
                if (!layoverOk) continue;

                results.push(buildMultiLegResult(
                    [posFlight, mainFlight],
                    [hub],
                    'reward-positioning',
                    origin, dest, cabin,
                    { positioning: true, mainLegIndex: 1, allReward: true }
                ));
            }
        }
    }

    cacheSet(ckey, results, CACHE_CONFIG.ROUTE_TTL);
    return { results, apiCalls, cached: 0 };
}

/**
 * Step 4: SEA → EUR Hub + EUR Hub → Final Dest
 */
async function searchSEAToEurHub(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    const ckey = cacheKey('step4', { origin, dest, ...dateRange, cabin, sources });
    const cached = cacheGet(ckey);
    if (cached) return { results: cached, apiCalls: 0, cached: 1 };

    const seaHubs = getSEAHubs();
    const eurHubs = EUR_HUBS.filter(h => h !== dest);
    const positioningCabins = getPositioningCabins(cabin, cabinOverrides);
    const results = [];
    let apiCalls = 0;

    // We search top 3 SEA hubs nearest to origin for efficiency
    const topSEA = seaHubs.slice(0, 4);

    for (const seaHub of topSEA) {
        // Search SEA → any EUR hub
        const seaEurKey = cacheKey('sea-eur', { seaHub, ...dateRange, cabin, sources });
        let seaEurData = cacheGet(seaEurKey);

        if (!seaEurData) {
            if (!trackApiCall()) continue;
            try {
                seaEurData = await cachedSearch({
                    origin: seaHub,
                    destination: eurHubs.join(','),
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 200,
                });
                cacheSet(seaEurKey, seaEurData, CACHE_CONFIG.REGION_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!seaEurData || seaEurData.length === 0) continue;

        // Group by EUR hub arrival
        const byEurHub = {};
        for (const avail of seaEurData) {
            const eurDest = avail.Route?.DestinationAirport;
            if (!eurDest || eurDest === dest) continue; // Skip if it's already the final dest (Step 3 handles that)
            if (!byEurHub[eurDest]) byEurHub[eurDest] = [];
            byEurHub[eurDest].push(avail);
        }

        // For each EUR hub, search EUR hub → final destination
        for (const [eurHub, seaToEurFlights] of Object.entries(byEurHub)) {
            const eurDestKey = cacheKey('eur-dest', { eurHub, dest, ...dateRange, sources });
            let eurDestData = cacheGet(eurDestKey);

            if (!eurDestData) {
                if (!trackApiCall()) continue;
                try {
                    eurDestData = await cachedSearch({
                        origin: eurHub,
                        destination: dest,
                        startDate: dateRange.start,
                        endDate: dateRange.end,
                        sources,
                        take: 50,
                    });
                    cacheSet(eurDestKey, eurDestData, CACHE_CONFIG.ROUTE_TTL);
                    apiCalls++;
                } catch (e) {
                    continue;
                }
            }

            if (!eurDestData || eurDestData.length === 0) continue;

            // Also need AUS → SEA positioning
            const posKey = cacheKey('pos-aus-sea', { origin, hub: seaHub, ...dateRange, sources });
            let posData = cacheGet(posKey);
            // posData may already be cached from Step 3

            if (!posData) {
                if (!trackApiCall()) continue;
                try {
                    posData = await cachedSearch({
                        origin,
                        destination: seaHub,
                        startDate: dateRange.start, // Anchor to user's search window
                        endDate: dateRange.end,
                        sources,
                        take: 50,
                    });
                    cacheSet(posKey, posData, CACHE_CONFIG.ROUTE_TTL);
                    apiCalls++;
                } catch (e) {
                    continue;
                }
            }

            if (!posData || posData.length === 0) continue;

            // Build 3-leg routes: AUS→SEA + SEA→EUR hub + EUR hub→dest
            // FIX #13: Only assemble routes where dates are chronological
            for (const mainFlight of seaToEurFlights.slice(0, 2)) {
                for (const lastLeg of eurDestData.slice(0, 2)) {
                    // Check SEA→EUR date <= EUR→dest date (legs must be chronological)
                    const mainDate = mainFlight.Date ? new Date(mainFlight.Date) : null;
                    const lastDate = lastLeg.Date ? new Date(lastLeg.Date) : null;
                    if (mainDate && lastDate && lastDate < mainDate) continue; // Skip backwards

                    for (const posFlight of posData.slice(0, 2)) {
                        // Check AUS→SEA date <= SEA→EUR date
                        const posDate = posFlight.Date ? new Date(posFlight.Date) : null;
                        if (posDate && mainDate && mainDate < posDate) continue; // Skip backwards

                        results.push(buildMultiLegResult(
                            [posFlight, mainFlight, lastLeg],
                            [seaHub, eurHub],
                            'reward-positioning',
                            origin, dest, cabin,
                            { positioning: true, mainLegIndex: 1, allReward: true }
                        ));
                    }
                }
            }
        }
    }

    cacheSet(ckey, results, CACHE_CONFIG.REGION_TTL);
    return { results, apiCalls, cached: 0 };
}

/**
 * Step 5: Cash AUS → SEA (1 leg max) + Reward SEA → dest
 */
async function searchCashPositioning1Leg(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    // No step-level cache — reuses already-cached sea-dest data from Step 3

    const seaHubs = getSEAHubs();
    const posCabins = getPositioningCabins(cabin, cabinOverrides);
    const results = [];
    let apiCalls = 0;

    for (const hub of seaHubs) {
        // Try to reuse SEA → dest cached results from Step 3, otherwise fetch
        const hubKey = cacheKey('sea-dest', { hub, dest, ...dateRange, cabin, sources });
        let seaToDestData = cacheGet(hubKey);

        if (!seaToDestData) {
            if (!trackApiCall()) continue;
            try {
                seaToDestData = await cachedSearch({
                    origin: hub,
                    destination: dest,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 100,
                });
                cacheSet(hubKey, seaToDestData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!seaToDestData || seaToDestData.length === 0) continue;

        // Build cash positioning AUS → SEA
        const cashCabin = posCabins.cashPositioning[0] || 'Y';
        const cashFare = estimateCashFare(origin, hub, cashCabin);
        const cashDuration = estimateFlightMinutes(origin, hub);

        for (const mainFlight of seaToDestData.slice(0, 5)) {
            const cashLeg = {
                origin,
                destination: hub,
                cabin: cashCabin,
                isReward: false,
                isCash: true,
                isMainLeg: false,
                label: getSegmentLabel(cashCabin, false),
                durationMinutes: cashDuration,
                durationFormatted: formatDuration(cashDuration),
                estimatedPrice: cashFare.price,
                currency: cashFare.currency,
                isEstimate: true,
                airlines: getCommonAirline(origin, hub),
            };

            const mainLeg = buildMainLeg(mainFlight, cabin, dest);

            const route = {
                type: 'hybrid-1-cash',
                origin,
                destination: dest,
                viaHubs: [hub],
                legs: [cashLeg, mainLeg],
                totalPoints: mainLeg.points || 0,
                totalTaxes: mainLeg.taxes || 0,
                totalCash: cashFare.price || 0,
                totalDurationMinutes: (cashLeg.durationMinutes || 0) + (mainLeg.durationMinutes || 0) + 240, // +4h estimated layover
                totalLayoverMinutes: 240,
                totalStops: 1 + (mainLeg.stops || 0),
                date: mainFlight.Date,
                source: mainFlight.Source,
                rewardPercent: 0, // Will be calculated after
            };

            route.rewardPercent = rewardPercentage(route);
            route.totalDurationFormatted = formatDuration(route.totalDurationMinutes);
            results.push(route);
        }
    }

    return { results, apiCalls, cached: 0 };
}

/**
 * Step 6: Cash AUS → SEA (2 legs) + Reward SEA → dest + optional cash EUR hub → dest
 */
async function searchCashPositioning2Legs(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    // No step-level cache — reuses already-cached sea-dest data

    const posCabins = getPositioningCabins(cabin, cabinOverrides);
    const cashCabin = posCabins.cashPositioning[0] || 'Y';
    const results = [];

    // Try 2-leg cash: AUS → intermediate → SEA hub
    // Common intermediate points from AU
    const intermediates = ['DPS', 'SIN', 'KUL'];

    let apiCalls = 0;

    for (const hub of getSEAHubs()) {
        const hubKey = cacheKey('sea-dest', { hub, dest, ...dateRange, cabin, sources });
        let seaToDestData = cacheGet(hubKey);

        if (!seaToDestData) {
            if (!trackApiCall()) continue;
            try {
                seaToDestData = await cachedSearch({
                    origin: hub,
                    destination: dest,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 100,
                });
                cacheSet(hubKey, seaToDestData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!seaToDestData || seaToDestData.length === 0) continue;

        for (const intermediate of intermediates) {
            if (intermediate === hub) continue;

            const cashFare1 = estimateCashFare(origin, intermediate, cashCabin);
            const cashDuration1 = estimateFlightMinutes(origin, intermediate);
            const cashFare2 = estimateCashFare(intermediate, hub, cashCabin);
            const cashDuration2 = estimateFlightMinutes(intermediate, hub);

            if (!cashDuration1 || !cashDuration2) continue;

            for (const mainFlight of seaToDestData.slice(0, 3)) {
                const cashLeg1 = {
                    origin,
                    destination: intermediate,
                    cabin: cashCabin,
                    isReward: false,
                    isCash: true,
                    isMainLeg: false,
                    label: getSegmentLabel(cashCabin, false),
                    durationMinutes: cashDuration1,
                    durationFormatted: formatDuration(cashDuration1),
                    estimatedPrice: cashFare1.price,
                    currency: cashFare1.currency,
                    isEstimate: true,
                    airlines: getCommonAirline(origin, intermediate),
                };

                const cashLeg2 = {
                    origin: intermediate,
                    destination: hub,
                    cabin: cashCabin,
                    isReward: false,
                    isCash: true,
                    isMainLeg: false,
                    label: getSegmentLabel(cashCabin, false),
                    durationMinutes: cashDuration2,
                    durationFormatted: formatDuration(cashDuration2),
                    estimatedPrice: cashFare2.price,
                    currency: cashFare2.currency,
                    isEstimate: true,
                    airlines: getCommonAirline(intermediate, hub),
                };

                const mainLeg = buildMainLeg(mainFlight, cabin, dest);

                const route = {
                    type: 'hybrid-2-cash',
                    origin,
                    destination: dest,
                    viaHubs: [intermediate, hub],
                    legs: [cashLeg1, cashLeg2, mainLeg],
                    totalPoints: mainLeg.points || 0,
                    totalTaxes: mainLeg.taxes || 0,
                    totalCash: (cashFare1.price || 0) + (cashFare2.price || 0),
                    totalDurationMinutes: (cashLeg1.durationMinutes || 0) + (cashLeg2.durationMinutes || 0) + (mainLeg.durationMinutes || 0) + 480,
                    totalLayoverMinutes: 480,
                    totalStops: 2 + (mainLeg.stops || 0),
                    date: mainFlight.Date,
                    source: mainFlight.Source,
                    rewardPercent: 0,
                };

                route.rewardPercent = rewardPercentage(route);
                route.totalDurationFormatted = formatDuration(route.totalDurationMinutes);
                results.push(route);
            }
        }
    }

    return { results, apiCalls, cached: 0 };
}


/**
 * Step 7: EUR Hub Extension — Cash last-mile from EUR hub to final destination
 * Uses cached SEA→EUR hub reward data from Step 4 and adds:
 *   Cash(AUS→SEA) + Reward(SEA→EUR hub) + Cash(EUR hub→dest)
 * This enables routes to non-hub European destinations (CPH, OSL, etc.)
 */
async function searchEurHubExtension(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    const seaHubs = getSEAHubs();
    const posCabins = getPositioningCabins(cabin, cabinOverrides);
    const cashCabin = posCabins.cashPositioning[0] || 'Y';
    const results = [];
    let apiCalls = 0;

    // Only run if destination is in Europe (no need for intra-Asia extensions)
    // We look for reward flights that land at a EUR hub near the destination
    const nearbyEurHubs = EUR_HUBS.filter(h => h !== dest);
    if (nearbyEurHubs.length === 0) return { results, apiCalls, cached: 0 };

    for (const seaHub of seaHubs) {  // Check ALL SEA hubs (Step 7 reuses cached data, so cost is minimal)
        // Use our own cache key that includes ALL EUR hubs (unlike Step 4 which excludes dest)
        const seaEurAllKey = cacheKey('sea-eur-all', { seaHub, ...dateRange, cabin, sources });
        let seaEurData = cacheGet(seaEurAllKey);

        // Try Step 4's cache as fallback
        if (!seaEurData) {
            const step4Key = cacheKey('sea-eur', { seaHub, ...dateRange, cabin, sources });
            seaEurData = cacheGet(step4Key);
        }

        // If still no data, make our own API call with ALL EUR hubs
        if (!seaEurData || seaEurData.length === 0) {
            if (!trackApiCall()) continue;
            try {
                seaEurData = await cachedSearch({
                    origin: seaHub,
                    destination: EUR_HUBS.join(','), // ALL EUR hubs, no exclusions
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 200,
                });
                cacheSet(seaEurAllKey, seaEurData, CACHE_CONFIG.REGION_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!seaEurData || seaEurData.length === 0) continue;

        // Group by EUR hub destination
        for (const eurHub of nearbyEurHubs) {
            const eurFlights = seaEurData.filter(a =>
                a.Route?.DestinationAirport === eurHub
            );
            if (eurFlights.length === 0) continue;

            // Estimate cash fare for EUR hub → final destination (last-mile)
            const lastMileFare = estimateCashFare(eurHub, dest, cashCabin);
            const lastMileDuration = estimateFlightMinutes(eurHub, dest);
            if (!lastMileDuration || lastMileDuration > 300) continue; // Skip if > 5h (too far to be a "last-mile")

            // Also get cash positioning for AUS → SEA
            const cashFareFirst = estimateCashFare(origin, seaHub, cashCabin);
            const cashDurationFirst = estimateFlightMinutes(origin, seaHub);

            for (const rewardFlight of eurFlights.slice(0, 3)) {
                const rewardDate = rewardFlight.Date ? new Date(rewardFlight.Date) : null;

                // Build 3-leg hybrid: Cash(AUS→SEA) + Reward(SEA→EUR) + Cash(EUR→dest)
                const cashLegFirst = {
                    origin,
                    destination: seaHub,
                    cabin: cashCabin,
                    isReward: false,
                    isCash: true,
                    isMainLeg: false,
                    label: getSegmentLabel(cashCabin, false),
                    durationMinutes: cashDurationFirst,
                    durationFormatted: formatDuration(cashDurationFirst),
                    estimatedPrice: cashFareFirst.price,
                    currency: cashFareFirst.currency,
                    isEstimate: true,
                    airlines: getCommonAirline(origin, seaHub),
                };

                const mainLeg = buildMainLeg(rewardFlight, cabin, eurHub);

                const cashLegLast = {
                    origin: eurHub,
                    destination: dest,
                    cabin: cashCabin,
                    isReward: false,
                    isCash: true,
                    isMainLeg: false,
                    label: getSegmentLabel(cashCabin, false),
                    durationMinutes: lastMileDuration,
                    durationFormatted: formatDuration(lastMileDuration),
                    estimatedPrice: lastMileFare.price,
                    currency: lastMileFare.currency,
                    isEstimate: true,
                    airlines: getCommonAirline(eurHub, dest),
                };

                const totalCash = (cashFareFirst.price || 0) + (lastMileFare.price || 0);
                const totalPoints = mainLeg.points || 0;
                const totalDuration = (cashLegFirst.durationMinutes || 0) + (mainLeg.durationMinutes || 0) + (cashLegLast.durationMinutes || 0) + 480; // +8h for 2 layovers

                const route = {
                    type: 'hybrid-2-cash',
                    origin,
                    destination: dest,
                    viaHubs: [seaHub, eurHub],
                    legs: [cashLegFirst, mainLeg, cashLegLast],
                    totalPoints,
                    totalTaxes: mainLeg.taxes || 0,
                    totalCash,
                    totalDurationMinutes: totalDuration,
                    totalDurationFormatted: formatDuration(totalDuration),
                    totalLayoverMinutes: 480,
                    totalStops: 2 + (mainLeg.stops || 0),
                    date: rewardFlight.Date,
                    source: rewardFlight.Source,
                    rewardPercent: 0,
                };

                route.rewardPercent = rewardPercentage(route);
                results.push(route);
            }
        }
    }

    return { results, apiCalls, cached: 0 };
}

// ═══════════════════════════════════════════════
// NEW CORRIDOR STEPS (8-10)
// Same pattern as Steps 3/5 but with different hub sets
// ═══════════════════════════════════════════════

/**
 * Determine destination region from airport code
 */
function getDestRegion(dest) {
    const airport = AIRPORTS[dest];
    if (!airport) return 'unknown';
    return airport.region || 'unknown';
}

/**
 * Step 8: Pacific Hub → USA destination + position AU → Pacific hub
 * Corridor: AU → NAN/AKL/CHC (positioning) → US destination (reward)
 */
async function searchPacificToUSA(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    const ckey = cacheKey('step8-pacific-usa', { origin, dest, ...dateRange, cabin, sources });
    const cached = cacheGet(ckey);
    if (cached) return { results: cached, apiCalls: 0, cached: 1 };

    const pacificHubs = PACIFIC_HUBS;
    const positioningCabins = getPositioningCabins(cabin, cabinOverrides);
    const results = [];
    let apiCalls = 0;

    for (const hub of pacificHubs) {
        // Search hub → US destination (reward)
        const hubKey = cacheKey('pacific-us', { hub, dest, ...dateRange, cabin, sources });
        let hubToDestData = cacheGet(hubKey);

        if (!hubToDestData) {
            if (!trackApiCall()) continue;
            try {
                hubToDestData = await cachedSearch({
                    origin: hub,
                    destination: dest,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 100,
                });
                cacheSet(hubKey, hubToDestData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!hubToDestData || hubToDestData.length === 0) continue;

        // Search positioning AU → Pacific hub (reward)
        const posKey = cacheKey('pos-aus-pacific', { origin, hub, ...dateRange, sources });
        let posData = cacheGet(posKey);

        if (!posData) {
            if (!trackApiCall()) continue;
            try {
                const posCabins = positioningCabins.rewardPositioning.map(c => cabinToApiCabin(c)).join(',');
                posData = await cachedSearch({
                    origin,
                    destination: hub,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: posCabins,
                    sources,
                    take: 100,
                });
                cacheSet(posKey, posData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!posData || posData.length === 0) continue;

        // Combine: AU → Pacific hub (positioning) + Pacific hub → US (main)
        for (const mainFlight of hubToDestData.slice(0, 5)) {
            for (const posFlight of posData.slice(0, 3)) {
                const posDate = posFlight.Date ? new Date(posFlight.Date) : null;
                const mainDate = mainFlight.Date ? new Date(mainFlight.Date) : null;
                if (posDate && mainDate && mainDate < posDate) continue;

                const layoverOk = checkLayover(posFlight, mainFlight, hub);
                if (!layoverOk) continue;

                results.push(buildMultiLegResult(
                    [posFlight, mainFlight],
                    [hub],
                    'reward-positioning',
                    origin, dest, cabin,
                    { positioning: true, mainLegIndex: 1, allReward: true }
                ));
            }
        }
    }

    cacheSet(ckey, results, CACHE_CONFIG.ROUTE_TTL);
    return { results, apiCalls, cached: 0 };
}

/**
 * Step 8b: Cash AU → Pacific hub + Reward Pacific → US
 * Hybrid corridor: Cash(AU→NAN/AKL/CHC) + Reward(hub→USA)
 */
async function searchCashPacificToUSA(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    const pacificHubs = PACIFIC_HUBS;
    const posCabins = getPositioningCabins(cabin, cabinOverrides);
    const results = [];
    let apiCalls = 0;

    for (const hub of pacificHubs) {
        // Reuse cached hub → dest data from Step 8
        const hubKey = cacheKey('pacific-us', { hub, dest, ...dateRange, cabin, sources });
        let hubToDestData = cacheGet(hubKey);

        if (!hubToDestData) {
            if (!trackApiCall()) continue;
            try {
                hubToDestData = await cachedSearch({
                    origin: hub,
                    destination: dest,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 100,
                });
                cacheSet(hubKey, hubToDestData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!hubToDestData || hubToDestData.length === 0) continue;

        // Build cash positioning AU → Pacific hub
        const cashCabin = posCabins.cashPositioning[0] || 'Y';
        const cashFare = estimateCashFare(origin, hub, cashCabin);
        const cashDuration = estimateFlightMinutes(origin, hub);

        for (const mainFlight of hubToDestData.slice(0, 5)) {
            const cashLeg = {
                origin,
                destination: hub,
                cabin: cashCabin,
                isReward: false,
                isCash: true,
                isMainLeg: false,
                label: getSegmentLabel(cashCabin, false),
                durationMinutes: cashDuration,
                durationFormatted: formatDuration(cashDuration),
                estimatedPrice: cashFare.price,
                currency: cashFare.currency,
                isEstimate: true,
                airlines: getCommonAirline(origin, hub),
            };

            const mainLeg = buildMainLeg(mainFlight, cabin, dest);

            const route = {
                type: 'hybrid-1-cash',
                origin,
                destination: dest,
                viaHubs: [hub],
                legs: [cashLeg, mainLeg],
                totalPoints: mainLeg.points || 0,
                totalTaxes: mainLeg.taxes || 0,
                totalCash: cashFare.price || 0,
                totalDurationMinutes: (cashLeg.durationMinutes || 0) + (mainLeg.durationMinutes || 0) + 240,
                totalLayoverMinutes: 240,
                totalStops: 1 + (mainLeg.stops || 0),
                date: mainFlight.Date,
                source: mainFlight.Source,
                rewardPercent: 0,
            };

            route.rewardPercent = rewardPercentage(route);
            route.totalDurationFormatted = formatDuration(route.totalDurationMinutes);
            results.push(route);
        }
    }

    return { results, apiCalls, cached: 0 };
}

/**
 * Step 9: SEA Hub → South America/Asia + position AU → SEA hub
 * Generic corridor: Reuses SEA hubs for non-European destinations
 * Works for SAM (South America) and Asia destinations
 */
async function searchSEAToGlobalDest(origin, dest, dateRange, cabin, sources, cabinOverrides, stepLabel) {
    const ckey = cacheKey('step9-sea-global', { origin, dest, ...dateRange, cabin, sources });
    const cached = cacheGet(ckey);
    if (cached) return { results: cached, apiCalls: 0, cached: 1 };

    const seaHubs = getSEAHubs();
    const positioningCabins = getPositioningCabins(cabin, cabinOverrides);
    const results = [];
    let apiCalls = 0;

    for (const hub of seaHubs) {
        // Search hub → global destination (reward)
        const hubKey = cacheKey('sea-global', { hub, dest, ...dateRange, cabin, sources });
        let hubToDestData = cacheGet(hubKey);

        if (!hubToDestData) {
            if (!trackApiCall()) continue;
            try {
                hubToDestData = await cachedSearch({
                    origin: hub,
                    destination: dest,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 100,
                });
                cacheSet(hubKey, hubToDestData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!hubToDestData || hubToDestData.length === 0) continue;

        // Search positioning AU → SEA hub (reward)
        const posKey = cacheKey('pos-aus-sea', { origin, hub, ...dateRange, sources });
        let posData = cacheGet(posKey);

        if (!posData) {
            if (!trackApiCall()) continue;
            try {
                const posCabins = positioningCabins.rewardPositioning.map(c => cabinToApiCabin(c)).join(',');
                posData = await cachedSearch({
                    origin,
                    destination: hub,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: posCabins,
                    sources,
                    take: 100,
                });
                cacheSet(posKey, posData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!posData || posData.length === 0) continue;

        // Combine: AU → SEA (positioning) + SEA → dest (main)
        for (const mainFlight of hubToDestData.slice(0, 5)) {
            for (const posFlight of posData.slice(0, 3)) {
                const posDate = posFlight.Date ? new Date(posFlight.Date) : null;
                const mainDate = mainFlight.Date ? new Date(mainFlight.Date) : null;
                if (posDate && mainDate && mainDate < posDate) continue;

                const layoverOk = checkLayover(posFlight, mainFlight, hub);
                if (!layoverOk) continue;

                results.push(buildMultiLegResult(
                    [posFlight, mainFlight],
                    [hub],
                    'reward-positioning',
                    origin, dest, cabin,
                    { positioning: true, mainLegIndex: 1, allReward: true }
                ));
            }
        }
    }

    cacheSet(ckey, results, CACHE_CONFIG.ROUTE_TTL);
    return { results, apiCalls, cached: 0 };
}

/**
 * Step 9b: Cash AU → SEA + Reward SEA → Global (SAM/Asia)
 * Hybrid version of Step 9
 */
async function searchCashSEAToGlobalDest(origin, dest, dateRange, cabin, sources, cabinOverrides) {
    const seaHubs = getSEAHubs();
    const posCabins = getPositioningCabins(cabin, cabinOverrides);
    const results = [];
    let apiCalls = 0;

    for (const hub of seaHubs) {
        const hubKey = cacheKey('sea-global', { hub, dest, ...dateRange, cabin, sources });
        let hubToDestData = cacheGet(hubKey);

        if (!hubToDestData) {
            if (!trackApiCall()) continue;
            try {
                hubToDestData = await cachedSearch({
                    origin: hub,
                    destination: dest,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    cabin: cabinToApiCabin(cabin),
                    sources,
                    take: 100,
                });
                cacheSet(hubKey, hubToDestData, CACHE_CONFIG.ROUTE_TTL);
                apiCalls++;
            } catch (e) {
                continue;
            }
        }

        if (!hubToDestData || hubToDestData.length === 0) continue;

        const cashCabin = posCabins.cashPositioning[0] || 'Y';
        const cashFare = estimateCashFare(origin, hub, cashCabin);
        const cashDuration = estimateFlightMinutes(origin, hub);

        for (const mainFlight of hubToDestData.slice(0, 5)) {
            const cashLeg = {
                origin,
                destination: hub,
                cabin: cashCabin,
                isReward: false,
                isCash: true,
                isMainLeg: false,
                label: getSegmentLabel(cashCabin, false),
                durationMinutes: cashDuration,
                durationFormatted: formatDuration(cashDuration),
                estimatedPrice: cashFare.price,
                currency: cashFare.currency,
                isEstimate: true,
                airlines: getCommonAirline(origin, hub),
            };

            const mainLeg = buildMainLeg(mainFlight, cabin, dest);

            const route = {
                type: 'hybrid-1-cash',
                origin,
                destination: dest,
                viaHubs: [hub],
                legs: [cashLeg, mainLeg],
                totalPoints: mainLeg.points || 0,
                totalTaxes: mainLeg.taxes || 0,
                totalCash: cashFare.price || 0,
                totalDurationMinutes: (cashLeg.durationMinutes || 0) + (mainLeg.durationMinutes || 0) + 240,
                totalLayoverMinutes: 240,
                totalStops: 1 + (mainLeg.stops || 0),
                date: mainFlight.Date,
                source: mainFlight.Source,
                rewardPercent: 0,
            };

            route.rewardPercent = rewardPercentage(route);
            route.totalDurationFormatted = formatDuration(route.totalDurationMinutes);
            results.push(route);
        }
    }

    return { results, apiCalls, cached: 0 };
}


// ═══════════════════════════════════════════════

function getSources(program) {
    switch (program) {
        case 'qantas': return 'qantas';
        case 'velocity': return 'velocity';
        case 'both': return 'qantas,velocity';
        case 'all': return '';
        default: return 'qantas,velocity';
    }
}

function getDateRange(date, endDate) {
    const d = new Date(date);

    let start, end;
    if (endDate) {
        // User-specified date range — use it exactly
        start = new Date(date);
        end = new Date(endDate);
    } else {
        // Default: ±2 day window around selected date
        const offset = SEARCH_DEFAULTS.DATE_RANGE_DAYS;
        start = new Date(d);
        start.setDate(start.getDate() - offset);
        end = new Date(d);
        end.setDate(end.getDate() + offset);
    }

    const posStart = new Date(start);
    posStart.setDate(posStart.getDate() - 1); // Allow previous-day departure for positioning

    return {
        start: formatDate(start),
        end: formatDate(end),
        posStart: formatDate(posStart),
        exact: date,
    };
}

function formatDate(d) {
    return d.toISOString().split('T')[0];
}

function cabinToApiCabin(cabinCode) {
    const map = { Y: 'economy', W: 'premium', J: 'business', F: 'first' };
    return map[cabinCode] || 'business';
}

function buildRewardResult(avail, type, origin, dest, cabin) {
    const cabinKey = cabin; // Y/W/J/F
    const mileageCost = parseInt(avail[`${cabinKey}MileageCost`] || '0', 10);
    const airlines = avail[`${cabinKey}Airlines`] || avail.Source || '';
    const isDirect = avail[`${cabinKey}Direct`] || false;
    const remainingSeats = avail[`${cabinKey}RemainingSeats`] || 0;
    const totalTaxes = avail.TotalTaxes || 0;

    const origAirport = avail.Route?.OriginAirport || origin;
    const destAirport = avail.Route?.DestinationAirport || dest;
    const estDuration = estimateFlightMinutes(origAirport, destAirport);

    const mainLeg = {
        origin: origAirport,
        destination: destAirport,
        cabin: cabinKey,
        isReward: true,
        isCash: false,
        isMainLeg: true,
        label: getSegmentLabel(cabinKey, true),
        points: mileageCost,
        taxes: totalTaxes,
        durationMinutes: estDuration,
        durationFormatted: formatDuration(estDuration),
        airlines,
        isDirect,
        remainingSeats,
        stops: isDirect ? 0 : 1,
    };

    return {
        id: avail.ID,
        type,
        origin: origAirport,
        destination: destAirport,
        legs: [mainLeg],
        totalPoints: mileageCost,
        totalTaxes: totalTaxes,
        totalCash: 0,
        totalDurationMinutes: estDuration || 0,
        totalDurationFormatted: formatDuration(estDuration),
        totalLayoverMinutes: 0,
        totalStops: isDirect ? 0 : 1,
        date: avail.Date,
        source: avail.Source,
        airlines,
        remainingSeats,
        rewardPercent: 100,
        viaHubs: [],
    };
}

function buildTripResult(trip, avail, type, cabin) {
    const segments = trip.AvailabilitySegments || [];
    const legs = segments.map((seg, i) => ({
        origin: seg.OriginAirport,
        destination: seg.DestinationAirport,
        cabin: cabin,
        isReward: true,
        isCash: false,
        isMainLeg: i === 0,
        label: getSegmentLabel(cabin, true),
        flightNumber: seg.FlightNumber,
        airlines: seg.FlightNumber?.substring(0, 2) || '',
        departureTime: seg.DepartsAt,
        arrivalTime: seg.ArrivesAt,
        durationMinutes: calcSegmentDuration(seg),
        durationFormatted: formatDuration(calcSegmentDuration(seg)),
        aircraft: seg.AircraftName,
        stops: 0,
    }));

    const totalDuration = trip.TotalDuration || legs.reduce((s, l) => s + (l.durationMinutes || 0), 0);

    return {
        id: trip.ID,
        type,
        origin: trip.AvailabilitySegments?.[0]?.OriginAirport || avail.Route?.OriginAirport,
        destination: segments[segments.length - 1]?.DestinationAirport || avail.Route?.DestinationAirport,
        legs,
        totalPoints: trip.MileageCost || 0,
        totalTaxes: trip.TotalTaxes || 0,
        totalCash: 0,
        totalDurationMinutes: totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
        totalLayoverMinutes: totalDuration - legs.reduce((s, l) => s + (l.durationMinutes || 0), 0),
        totalStops: trip.Stops || 0,
        date: avail.Date,
        source: trip.Source || avail.Source,
        airlines: trip.Carriers || '',
        remainingSeats: trip.RemainingSeats || 0,
        rewardPercent: 100,
        viaHubs: segments.slice(0, -1).map(s => s.DestinationAirport),
        departureTime: trip.DepartsAt,
        arrivalTime: trip.ArrivesAt,
    };
}

/**
 * Extract unique airline codes from flight numbers string.
 * e.g. 'QF71, BA12' → 'QF, BA'
 * Falls back to provided fallback if no flight numbers available.
 */
function extractAirlinesFromFlightNumbers(flightNumbers, fallback) {
    if (!flightNumbers || typeof flightNumbers !== 'string') return fallback || '';
    const codes = flightNumbers.split(/[,\s]+/)
        .map(fn => fn.replace(/[0-9]+$/, '').trim())
        .filter(c => c.length >= 2);
    const unique = [...new Set(codes)];
    return unique.length > 0 ? unique.join(', ') : (fallback || '');
}

function buildMainLeg(avail, cabin, dest) {
    const cabinKey = cabin;
    const mileageCost = parseInt(avail[`${cabinKey}MileageCost`] || '0', 10);
    const rawAirlines = avail[`${cabinKey}Airlines`] || avail.Source || '';
    const isDirect = avail[`${cabinKey}Direct`] || false;

    // Find matching trip for this cabin
    const cabinName = cabin === 'J' ? 'business' : cabin === 'F' ? 'first' : cabin === 'W' ? 'premium' : 'economy';
    const matchingTrip = avail.AvailabilityTrips?.find(t => t.Cabin === cabinName) || avail.AvailabilityTrips?.[0] || null;

    // Extract taxes: cabin-specific field (in cents), fall back to trip-level data
    let totalTaxesCents = parseInt(avail[`${cabinKey}TotalTaxes`] || '0', 10);
    if (!totalTaxesCents && matchingTrip) {
        totalTaxesCents = matchingTrip.TotalTaxes || 0;
    }
    const totalTaxesRaw = Math.round(totalTaxesCents / 100); // cents → dollars (in origin currency)

    // Sanity cap: no legitimate reward taxes exceed $5,000 per leg (in any currency)
    const sanitizedTaxesRaw = totalTaxesRaw > 5000 ? 0 : totalTaxesRaw;

    // Extract times: top-level first, fall back to trip-level
    const departureTime = avail.DepartsAt || matchingTrip?.DepartsAt || null;
    const arrivalTime = avail.ArrivesAt || matchingTrip?.ArrivesAt || null;

    // Extract real duration from trip data, fall back to multi-stop-aware estimate
    const origAirport = avail.Route?.OriginAirport;
    const destAirport = avail.Route?.DestinationAirport || dest;
    const tripDuration = matchingTrip?.TotalDuration || null;
    const tripStops = matchingTrip?.Stops || 0;
    const tripConnections = matchingTrip?.Connections || null;
    const estDuration = tripDuration || estimateMultiStopDuration(origAirport, destAirport, tripConnections, tripStops);

    // Convert taxes from origin airport's currency to AUD (now that origAirport is defined)
    const sanitizedTaxes = Math.round(convertTaxToAUD(sanitizedTaxesRaw, origAirport));

    // Extract airlines: prefer flight numbers for accuracy (Carriers lists ALL trip carriers)
    const flightNums = matchingTrip?.FlightNumbers || null;
    const airlines = extractAirlinesFromFlightNumbers(flightNums, matchingTrip?.Carriers || rawAirlines);

    return {
        origin: origAirport,
        destination: destAirport,
        cabin: cabinKey,
        isReward: true,
        isCash: false,
        isMainLeg: true,
        label: getSegmentLabel(cabinKey, true),
        points: mileageCost,
        taxes: sanitizedTaxes,
        durationMinutes: estDuration,
        durationFormatted: formatDuration(estDuration),
        airlines,
        isDirect: matchingTrip ? (matchingTrip.Stops === 0) : isDirect,
        stops: matchingTrip ? (matchingTrip.Stops || 0) : (isDirect ? 0 : 1),
        date: avail.Date,
        departureTime,
        arrivalTime,
        flightNumbers: matchingTrip?.FlightNumbers || null,
        viaAirport: matchingTrip?.Connections || null,
        remainingSeats: matchingTrip?.RemainingSeats || avail.RemainingSeats || avail[`${cabinKey}Remaining`] || 0,
        source: matchingTrip?.Source || avail.Source || '',
    };
}

function buildMultiLegResult(avails, viaHubs, type, origin, dest, cabin, opts = {}) {
    const legs = avails.map((avail, i) => {
        const isMain = i === (opts.mainLegIndex || 0);
        const origAP = avail.Route?.OriginAirport;
        const destAP = avail.Route?.DestinationAirport;
        const cabinKey = isMain ? cabin : (cabin === 'F' || cabin === 'J' ? 'Y' : 'Y');

        // Find matching trip for this cabin
        const cabinName = cabinKey === 'J' ? 'business' : cabinKey === 'F' ? 'first' : cabinKey === 'W' ? 'premium' : 'economy';
        const matchTrip = avail.AvailabilityTrips?.find(t => t.Cabin === cabinName) || avail.AvailabilityTrips?.[0] || null;

        const mileageCost = parseInt(avail[`${cabinKey}MileageCost`] || avail[`YMileageCost`] || '0', 10);
        const rawAirlines = matchTrip?.Carriers || avail[`${cabinKey}Airlines`] || avail[`YAirlines`] || avail.Source || '';
        const flightNums = matchTrip?.FlightNumbers || null;
        const airlines = extractAirlinesFromFlightNumbers(flightNums, rawAirlines);
        const isDirect = matchTrip ? (matchTrip.Stops === 0) : (avail[`${cabinKey}Direct`] || false);
        const tripStops = matchTrip?.Stops || (isDirect ? 0 : 1);
        const tripConnections = matchTrip?.Connections || null;
        const tripDuration = matchTrip?.TotalDuration || null;
        const estDuration = tripDuration || estimateMultiStopDuration(origAP, destAP, tripConnections, tripStops);

        // Extract taxes
        let legTaxesCents = parseInt(avail[`${cabinKey}TotalTaxes`] || avail[`YTotalTaxes`] || '0', 10);
        if (!legTaxesCents && matchTrip) {
            legTaxesCents = matchTrip.TotalTaxes || 0;
        }

        // Extract times
        const departureTime = avail.DepartsAt || matchTrip?.DepartsAt || null;
        const arrivalTime = avail.ArrivesAt || matchTrip?.ArrivesAt || null;

        return {
            origin: origAP,
            destination: destAP,
            cabin: isMain ? cabin : cabinKey,
            isReward: opts.allReward || true,
            isCash: false,
            isMainLeg: isMain,
            label: getSegmentLabel(isMain ? cabin : cabinKey, true),
            points: mileageCost,
            taxes: (() => { const t = Math.round(legTaxesCents / 100); return t > 5000 ? 0 : t; })(),
            durationMinutes: estDuration,
            durationFormatted: formatDuration(estDuration),
            airlines,
            isDirect,
            stops: matchTrip ? (matchTrip.Stops || 0) : (isDirect ? 0 : 1),
            date: avail.Date,
            departureTime,
            arrivalTime,
            remainingSeats: matchTrip?.RemainingSeats || avail.RemainingSeats || avail[`${cabinKey}Remaining`] || 0,
            flightNumbers: matchTrip?.FlightNumbers || null,
            viaAirport: matchTrip?.Connections || null,
            source: matchTrip?.Source || avail.Source || '',
        };
    });

    const totalPoints = legs.reduce((s, l) => s + (l.points || 0), 0);
    const totalTaxes = legs.reduce((s, l) => s + (l.taxes || 0), 0);
    const legDur = legs.reduce((s, l) => s + (l.durationMinutes || 0), 0);
    const layovers = (legs.length - 1) * 90; // ~1.5h estimated connection per stop
    const totalDur = legDur + layovers;

    return {
        type,
        origin,
        destination: dest,
        viaHubs,
        legs,
        totalPoints,
        totalTaxes,
        totalCash: 0,
        totalDurationMinutes: totalDur,
        totalDurationFormatted: formatDuration(totalDur),
        totalLayoverMinutes: layovers,
        totalStops: legs.length - 1 + legs.reduce((s, l) => s + (l.stops || 0), 0),
        date: avails[0]?.Date,
        source: avails[0]?.Source,
        rewardPercent: 100,
    };
}

function calcSegmentDuration(seg) {
    if (!seg.DepartsAt || !seg.ArrivesAt) return null;
    const dep = new Date(seg.DepartsAt);
    const arr = new Date(seg.ArrivesAt);
    return Math.round((arr - dep) / 60000);
}

function checkLayover(posFlight, mainFlight, hub, isHybrid = false) {
    // Strict chronological: each leg must depart AFTER the previous
    if (!posFlight.Date || !mainFlight.Date) return true;
    const posDate = new Date(posFlight.Date);
    const mainDate = new Date(mainFlight.Date);
    const diffHours = (mainDate - posDate) / (1000 * 60 * 60);

    // NEVER allow backwards dates (negative diff = impossible route)
    if (diffHours < 0) return false;

    if (isHybrid) {
        // Cash positioning: min 2h (120 min), max 12h
        return diffHours >= 2 && diffHours <= 12;
    }
    // Reward positioning: min 1h (60 min), max 36h
    return diffHours >= 1 && diffHours <= SEARCH_DEFAULTS.MAX_LAYOVER_HOURS;
}

function getCommonAirline(origin, dest) {
    // Common airlines for AU → SEA routes
    if (['SYD', 'MEL', 'BNE', 'PER', 'ADL'].includes(origin)) {
        if (['SIN'].includes(dest)) return 'SQ, QF';
        if (['KUL'].includes(dest)) return 'MH, QF';
        if (['BKK'].includes(dest)) return 'TG, QF';
        if (['DPS'].includes(dest)) return 'QF, JQ';
        if (['MNL'].includes(dest)) return 'PR, QF';
        if (['SGN', 'HAN'].includes(dest)) return 'VN';
        if (['CGK'].includes(dest)) return 'GA, QF';
        if (['HKT'].includes(dest)) return 'JQ';
        if (['HKG'].includes(dest)) return 'CX, QF';
        if (['NRT', 'HND'].includes(dest)) return 'QF, JL';
    }
    // EUR → EUR short-haul
    if (['AMS'].includes(origin)) {
        if (['LHR', 'LGW', 'STN'].includes(dest)) return 'KLM, BA';
        if (['CDG'].includes(dest)) return 'KLM, AF';
        if (['FRA'].includes(dest)) return 'KLM, LH';
        return 'KLM';
    }
    if (['CDG'].includes(origin)) {
        if (['LHR', 'LGW'].includes(dest)) return 'AF, BA';
        if (['AMS'].includes(dest)) return 'AF, KLM';
        if (['FRA'].includes(dest)) return 'AF, LH';
        return 'AF';
    }
    if (['FRA'].includes(origin)) {
        if (['LHR', 'LGW'].includes(dest)) return 'LH, BA';
        if (['AMS'].includes(dest)) return 'LH, KLM';
        if (['CDG'].includes(dest)) return 'LH, AF';
        return 'LH';
    }
    if (['LHR', 'LGW'].includes(origin)) {
        if (['AMS'].includes(dest)) return 'BA, KLM';
        if (['CDG'].includes(dest)) return 'BA, AF';
        if (['FRA'].includes(dest)) return 'BA, LH';
        return 'BA';
    }
    // SEA → EUR long-haul
    if (['SIN'].includes(origin)) return 'SQ';
    if (['BKK'].includes(origin)) return 'TG';
    if (['KUL'].includes(origin)) return 'MH';
    if (['DPS', 'CGK'].includes(origin)) return 'GA';
    if (['HKG'].includes(origin)) return 'CX';
    // Default: leave blank rather than wrong
    return '';
}

function deduplicateResults(results) {
    const seen = new Set();
    return results.filter(r => {
        const key = `${r.type}-${r.origin}-${r.destination}-${r.date}-${r.totalPoints}-${r.viaHubs?.join(',')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
