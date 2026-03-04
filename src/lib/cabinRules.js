// ══════════════════════════════════════════════
// CABIN POSITIONING RULES (Section 6 of fullscope.md)
// ══════════════════════════════════════════════

/**
 * Given the main long-haul cabin, returns allowed
 * positioning cabins for reward and cash legs.
 *
 * @param {string} mainCabin - Y/W/J/F
 * @param {object} [overrides] - User overrides from search or chatbot
 * @returns {{ rewardPositioning: string[], cashPositioning: string[] }}
 */
export function getPositioningCabins(mainCabin, overrides = null) {
    // User override takes precedence over all rules
    if (overrides) {
        return {
            rewardPositioning: overrides.rewardPositioning || getAllowedReward(mainCabin),
            cashPositioning: overrides.cashPositioning || getAllowedCash(mainCabin),
        };
    }

    return {
        rewardPositioning: getAllowedReward(mainCabin),
        cashPositioning: getAllowedCash(mainCabin),
    };
}

function getAllowedReward(mainCabin) {
    switch (mainCabin) {
        case 'J': // Business → Economy or Business
            return ['Y', 'J'];
        case 'F': // First → Economy or Business only (NOT First)
            return ['Y', 'J'];
        case 'W': // Premium Economy → Economy only
            return ['Y'];
        case 'Y': // Economy → Economy only
            return ['Y'];
        default:
            return ['Y'];
    }
}

function getAllowedCash(mainCabin) {
    switch (mainCabin) {
        case 'J': // Business → Economy default
            return ['Y'];
        case 'F': // First → Economy or Business
            return ['Y', 'J'];
        case 'W': // Premium Economy → Economy only
            return ['Y'];
        case 'Y': // Economy → Economy only
            return ['Y'];
        default:
            return ['Y'];
    }
}

/**
 * Check if a positioning cabin is valid for the given main cabin
 */
export function isValidPositioning(mainCabin, positioningCabin, isReward, overrides = null) {
    const allowed = getPositioningCabins(mainCabin, overrides);
    const list = isReward ? allowed.rewardPositioning : allowed.cashPositioning;
    return list.includes(positioningCabin);
}

/**
 * Get a label string for a segment
 * e.g., "BUSINESS REWARD" or "ECONOMY CASH"
 */
export function getSegmentLabel(cabin, isReward) {
    const cabinNames = { Y: 'ECONOMY', W: 'PREMIUM', J: 'BUSINESS', F: 'FIRST' };
    const type = isReward ? 'REWARD' : 'CASH';
    return `${cabinNames[cabin] || cabin} ${type}`;
}
