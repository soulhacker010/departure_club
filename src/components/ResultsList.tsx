// @ts-nocheck
'use client';

import { useState } from 'react';
import { getAirlineLogoUrl } from '@/lib/constants';

export default function ResultsList({ results, loading, error, selectedRoute, onSelectRoute }) {
    const [showAll, setShowAll] = useState(false);

    if (loading) {
        return (
            <div className="flights-list">
                <div className="empty-state">
                    <div className="loading-spinner" />
                    <h4>Searching...</h4>
                    <p>Running 6-step cascade search across reward programs</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flights-list">
                <div className="empty-state">
                    <div className="icon">⚠️</div>
                    <h4>Search Error</h4>
                    <p>{error}</p>
                </div>
                <div className="fallback-suggestions">
                    <p className="fallback-title">💡 Suggestions</p>
                    <ul>
                        <li>Try different travel dates (±1–2 weeks)</li>
                        <li>Try a nearby departure airport</li>
                        <li>Enable hybrid mode for more options</li>
                        <li>Switch to &quot;All Programs&quot; for broader availability</li>
                    </ul>
                </div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="flights-list">
                <div className="empty-state">
                    <div className="icon">✈️</div>
                    <h4>No Results Found</h4>
                    <p>No reward availability on these dates.</p>
                </div>
                <div className="fallback-suggestions">
                    <p className="fallback-title">💡 Try these suggestions</p>
                    <ul>
                        <li>Adjust dates — availability changes daily</li>
                        <li>Try a different cabin class (Economy has more seats)</li>
                        <li>Enable Hybrid mode to include cash positioning legs</li>
                        <li>Change departure to PER or MEL (different routes available)</li>
                        <li>Try &quot;All Programs&quot; instead of just Qantas/Velocity</li>
                    </ul>
                </div>
            </div>
        );
    }

    const displayLimit = showAll ? results.length : 10;
    const displayResults = results.slice(0, displayLimit);

    // Extract unique airline codes from a route's legs
    function getRouteAirlines(route) {
        if (!route.legs) return [];
        const codes = new Set();
        route.legs.forEach(leg => {
            if (leg.airlines) {
                leg.airlines.split(',').forEach(a => {
                    const code = a.trim().toUpperCase();
                    if (code && code !== 'QANTAS' && code !== 'VELOCITY' && code.length <= 3) {
                        codes.add(code);
                    }
                });
            }
        });
        return [...codes];
    }

    // Format departure date
    function formatDepDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    return (
        <div className="flights-list">
            {displayResults.map((route, i) => {
                const airlineCodes = getRouteAirlines(route);
                return (
                    <div
                        key={route.id || i}
                        className={`flight-card ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                        onClick={() => onSelectRoute(route)}
                    >
                        <div className="flight-route">
                            <div className="flight-airports">
                                <span className="airport-code">{route.origin}</span>
                                <div className="route-line">
                                    <span className="dash" />
                                    {route.viaHubs?.length > 0 && (
                                        <span className="via-hubs">{route.viaHubs.join(' · ')}</span>
                                    )}
                                    <span className="plane-icon">✈</span>
                                    <span className="dash" />
                                </div>
                                <span className="airport-code">{route.destination}</span>
                            </div>
                        </div>

                        <div className="flight-meta">
                            <div className="flight-airlines">
                                {/* Airline logos */}
                                {airlineCodes.length > 0 && (
                                    <div className="airline-logos">
                                        {airlineCodes.slice(0, 3).map(code => (
                                            <img
                                                key={code}
                                                src={getAirlineLogoUrl(code)}
                                                alt={code}
                                                className="airline-logo"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ))}
                                    </div>
                                )}
                                <span className={`route-type-tag ${route.type.startsWith('hybrid') ? 'hybrid-tag' : 'reward-tag'}`}>
                                    {getTypeShortLabel(route.type)}
                                </span>
                            </div>
                            <div className="flight-points">
                                {route.totalPoints > 0 && (
                                    <>
                                        <div className="points-value">{route.totalPoints.toLocaleString()}</div>
                                        <div className="points-label">points</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flight-details-row">
                            {route.date && (
                                <span className="detail-chip date-chip">📅 {formatDepDate(route.date)}</span>
                            )}
                            <span className="detail-chip">{route.totalDurationFormatted || 'N/A'}</span>
                            <span className="detail-chip">{route.totalStops || 0} stop{route.totalStops !== 1 ? 's' : ''}</span>
                            {route.totalCash > 0 && (
                                <span className="detail-chip cash-chip">~${route.totalCash}</span>
                            )}
                            <span className="detail-chip reward-pct">{route.rewardPercent || 0}% reward</span>
                        </div>
                        {route.totalTaxes > 0 && (
                            <div className="flight-taxes-row">
                                <span className="taxes-label">Taxes & fees: ~${route.totalTaxes.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                );
            })}
            {results.length > 10 && !showAll && (
                <div className="show-more-row">
                    <button className="show-more-btn" onClick={() => setShowAll(true)}>
                        Show {results.length - 10} more routes
                    </button>
                </div>
            )}
            {showAll && results.length > 10 && (
                <div className="show-more-row">
                    <button className="show-more-btn" onClick={() => setShowAll(false)}>
                        Show top 10 only
                    </button>
                </div>
            )}
        </div>
    );
}

function getTypeShortLabel(type) {
    switch (type) {
        case 'direct-reward': return '✈️ Direct';
        case 'reward-with-stops': return '🔄 Stops';
        case 'reward-positioning': return '🎯 Hub';
        case 'hybrid-1-cash': return '💳 1 Cash';
        case 'hybrid-2-cash': return '💳 2 Cash';
        default: return type;
    }
}
