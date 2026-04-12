// @ts-nocheck
// ══════════════════════════════════════════════
// SCORING & RANKING ENGINE
// Weighted scoring for result ordering
// ══════════════════════════════════════════════

/**
 * Score a single route result for ranking.
 * Lower score = better result.
 *
 * Weights chosen to match fullscope.md display order:
 *  1. Most direct reward-only
 *  2. Reward-only with longer layovers (≤36h)
 *  3. Hybrid (1 cash leg) fastest first
 *  4. Hybrid (2 cash legs) fastest first
 *
 * Date proximity: exact date = 0, ±1d = 50, ±2d = 100
 */
export function scoreRoute(route, searchedDate) {
    // Type priority (major factor)
    let typePenalty = 0;
    if (route.type === 'direct-reward') typePenalty = 0;
    else if (route.type === 'reward-with-stops') typePenalty = 100;
    else if (route.type === 'reward-positioning') typePenalty = 200;
    else if (route.type === 'hybrid-1-cash') typePenalty = 400;
    else if (route.type === 'hybrid-2-cash') typePenalty = 600;
    else typePenalty = 800;

    // Duration (normalized: 0-100 scale, 30h+ = 100)
    const durationScore = Math.min((route.totalDurationMinutes || 1800) / 1800, 1) * 100;

    // Points cost (normalized: 0-100 scale, 200k+ = 100)
    const pointsScore = Math.min((route.totalPoints || 0) / 200000, 1) * 100;

    // Cash cost (normalized: 0-100 scale, $2000+ = 100)
    const cashScore = Math.min((route.totalCash || 0) / 2000, 1) * 100;

    // Layover efficiency (penalty for long layovers)
    const totalLayoverMins = route.totalLayoverMinutes || 0;
    const layoverScore = Math.min(totalLayoverMins / (36 * 60), 1) * 100;

    // Cabin consistency bonus (all same cabin = 0, mixed = 50)
    const cabinSet = new Set((route.legs || []).map(l => l.cabin));
    const cabinScore = cabinSet.size <= 1 ? 0 : (cabinSet.size - 1) * 25;

    // Date proximity penalty: exact = 0, ±1d = 50, ±2d = 100
    let datePenalty = 0;
    if (searchedDate && route.date) {
        const searched = new Date(searchedDate);
        const routeDate = new Date(route.date);
        const daysDiff = Math.abs(Math.round((routeDate - searched) / (1000 * 60 * 60 * 24)));
        datePenalty = daysDiff * 50; // 0, 50, or 100
    }

    // Weighted total
    const score =
        typePenalty * 1.0 +
        durationScore * 0.3 +
        pointsScore * 0.2 +
        cashScore * 0.15 +
        layoverScore * 0.2 +
        cabinScore * 0.15 +
        datePenalty * 0.5;

    return Math.round(score * 100) / 100;
}

/**
 * Rank an array of route results.
 * Pinned slots:
 *   1. Fastest pure reward route
 *   2. Fastest hybrid (cash+reward) route
 * Then remaining results sorted by weighted score.
 */
export function rankRoutes(routes, searchedDate) {
    const scored = routes.map(r => ({ ...r, score: scoreRoute(r, searchedDate) }));

    // Separate reward-only vs hybrid
    const rewardTypes = ['direct-reward', 'reward-with-stops', 'reward-positioning'];
    const rewards = scored.filter(r => rewardTypes.includes(r.type));
    const hybrids = scored.filter(r => r.type.startsWith('hybrid'));

    // Find fastest of each category (lowest duration)
    const fastestReward = rewards.length > 0
        ? rewards.reduce((best, r) => (r.totalDurationMinutes || 9999) < (best.totalDurationMinutes || 9999) ? r : best)
        : null;
    const fastestHybrid = hybrids.length > 0
        ? hybrids.reduce((best, r) => (r.totalDurationMinutes || 9999) < (best.totalDurationMinutes || 9999) ? r : best)
        : null;

    // Remaining sorted by score — exclude pinned by reference, not ID
    const pinned = [fastestReward, fastestHybrid].filter(Boolean);
    const remaining = scored
        .filter(r => !pinned.includes(r))
        .sort((a, b) => a.score - b.score);

    // Assemble: pinned first, then rest
    return [...pinned, ...remaining];
}

/**
 * Apply filters to ranked results
 */
export function filterRoutes(routes, filters = {}) {
    let results = [...routes];

    // Type filter
    if (filters.type === 'reward-only') {
        results = results.filter(r => ['direct-reward', 'reward-with-stops', 'reward-positioning'].includes(r.type));
    } else if (filters.type === 'hybrid-only') {
        results = results.filter(r => r.type.startsWith('hybrid'));
    }

    // Cabin filter
    if (filters.cabin && filters.cabin !== 'all') {
        results = results.filter(r => {
            const mainLeg = r.legs?.find(l => l.isMainLeg);
            return mainLeg?.cabin === filters.cabin;
        });
    }

    // Sort override
    if (filters.sortBy === 'fastest') {
        results.sort((a, b) => (a.totalDurationMinutes || 9999) - (b.totalDurationMinutes || 9999));
    } else if (filters.sortBy === 'fewest-layovers') {
        results.sort((a, b) => (a.totalStops || 99) - (b.totalStops || 99));
    } else if (filters.sortBy === 'lowest-points') {
        results.sort((a, b) => (a.totalPoints || 999999) - (b.totalPoints || 999999));
    } else if (filters.sortBy === 'lowest-taxes') {
        results.sort((a, b) => (a.totalTaxes || 999999) - (b.totalTaxes || 999999));
    }

    return results;
}

/**
 * Calculate the percentage of journey flown on reward segments
 */
export function rewardPercentage(route) {
    if (!route.legs || route.legs.length === 0) return 0;
    const totalMins = route.legs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    const rewardMins = route.legs.filter(l => l.isReward).reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    return totalMins > 0 ? Math.round(rewardMins / totalMins * 100) : 0;
}
