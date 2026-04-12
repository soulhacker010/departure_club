// @ts-nocheck
// ══════════════════════════════════════════════
// SERVER-SIDE CACHE
// In-memory cache with TTL + daily API budget tracking
// ══════════════════════════════════════════════

import { CACHE_CONFIG } from './constants';

// In-memory store
const cache = new Map();

// Daily API call counter
let dailyCallCount = 0;
let dailyResetDate = new Date().toDateString();

/**
 * Get cached value if exists and not expired
 */
export function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

/**
 * Set cache value with TTL
 * @param {string} key
 * @param {any} data
 * @param {number} ttlMs - Time-to-live in milliseconds
 */
export function cacheSet(key, data, ttlMs) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
        createdAt: Date.now(),
    });

    // Prevent unbounded growth — evict oldest entries if cache > 500 items
    if (cache.size > 500) {
        const oldest = [...cache.entries()]
            .sort((a, b) => a[1].createdAt - b[1].createdAt)
            .slice(0, 100);
        oldest.forEach(([k]) => cache.delete(k));
    }
}

/**
 * Generate cache key from params object
 */
export function cacheKey(prefix, params) {
    const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    return `${prefix}:${sorted}`;
}

/**
 * Track an API call. Returns false if budget exhausted.
 */
export function trackApiCall() {
    const today = new Date().toDateString();
    if (today !== dailyResetDate) {
        dailyCallCount = 0;
        dailyResetDate = today;
    }

    if (dailyCallCount >= CACHE_CONFIG.DAILY_LIMIT) {
        return false; // Budget exhausted
    }

    dailyCallCount++;
    return true;
}

/**
 * Get current API usage stats
 */
export function getApiUsage() {
    const today = new Date().toDateString();
    if (today !== dailyResetDate) {
        dailyCallCount = 0;
        dailyResetDate = today;
    }
    return {
        used: dailyCallCount,
        limit: CACHE_CONFIG.DAILY_LIMIT,
        remaining: CACHE_CONFIG.DAILY_LIMIT - dailyCallCount,
    };
}

/**
 * Clear entire cache (for debugging)
 */
export function cacheClear() {
    cache.clear();
}
