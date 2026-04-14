// @ts-nocheck
'use client';

import { getAirlineLogoUrl, CABIN_LABELS } from '@/lib/constants';

export default function ResultRow({ route, expanded, onToggle, onDetails, rank }) {

    const legs = route.legs || [];
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];

    // Prefer the main reward leg for airline display
    const rewardLeg = legs.find(l => l.isReward && !l.isCash);
    const mainLeg = rewardLeg || firstLeg;
    const rawAirline = mainLeg?.airlines?.split(',')[0]?.trim() || '';
    const airlineCode = rawAirline.substring(0, 2).toUpperCase();
    const logoUrl = getAirlineLogoUrl(airlineCode);

    const isHybrid = route.type?.startsWith('hybrid');
    const isDirect = (route.totalStops || 0) === 0;
    const mainCabin = CABIN_LABELS[rewardLeg?.cabin] || CABIN_LABELS[firstLeg?.cabin] || 'Economy';

    const pts = route.totalPoints || 0;
    const taxes = route.totalTaxes || 0;
    const cash = route.totalCash || 0;

    // All unique airline codes
    const allCodes = [...new Set(
        legs.flatMap(l => (l.airlines || '').split(',').map(a => a.trim())).filter(Boolean)
    )].slice(0, 5).join(' · ');

    function fmt(iso) {
        if (!iso) return null;
        try {
            const match = iso.match(/T(\d{2}):(\d{2})/);
            return match ? `${match[1]}:${match[2]}` : null;
        }
        catch { return null; }
    }

    const departTime = fmt(firstLeg?.departureTime);
    const arriveTime = fmt(lastLeg?.arrivalTime);

    return (
        <div
            className={`rr-row ${expanded ? 'rr-row-open' : ''}`}
            onClick={onToggle}
            role="button"
            tabIndex={0}
        >
            {/* ── Airline + type ── */}
            <div className="rr-left">
                <div className="rr-logo-wrap">
                    {logoUrl
                        ? <img src={logoUrl} alt={airlineCode} className="rr-logo-img" onError={e => { e.target.style.display = 'none'; }} />
                        : <span className="rr-logo-text">{airlineCode || '?'}</span>
                    }
                </div>
                <div className="rr-airline-col">
                    <div className="rr-airline-name">{rawAirline || 'Multiple Airlines'}</div>
                    <div className="rr-badge-row">
                        <span className={`rr-badge ${isHybrid ? 'rr-badge-hybrid' : 'rr-badge-reward'}`}>
                            {isHybrid ? 'Hybrid' : 'Full Reward'}
                        </span>
                        <span className="rr-badge rr-badge-cabin">{mainCabin}</span>
                    </div>
                    {allCodes && <div className="rr-codes">{allCodes}</div>}
                </div>
            </div>

            {/* ── Route: times + duration ── */}
            <div className="rr-route">
                <div className="rr-endpoint">
                    <div className="rr-time">{departTime || firstLeg?.origin || '—'}</div>
                    <div className="rr-iata">{firstLeg?.origin}</div>
                </div>

                <div className="rr-mid">
                    <div className="rr-dur-label">{route.totalDurationFormatted || '—'}</div>
                    <div className="rr-flight-line">
                        <div className="rr-fl-inner" />
                        <span className="rr-fl-dot rr-fl-left" />
                        <span className="rr-fl-dot rr-fl-right" />
                    </div>
                    <div className="rr-stops-txt">
                        {isDirect ? 'Direct' : `${route.totalStops} stop${route.totalStops > 1 ? 's' : ''}`}
                    </div>
                </div>

                <div className="rr-endpoint rr-endpoint-r">
                    <div className="rr-time">{arriveTime || lastLeg?.destination || '—'}</div>
                    <div className="rr-iata">{lastLeg?.destination}</div>
                </div>
            </div>

            {/* ── Price + CTA ── */}
            <div className="rr-right" onClick={e => e.stopPropagation()}>
                <div className="rr-price-block">
                    <div className="rr-price-label">FROM</div>
                    {isHybrid && cash > 0 ? (
                        <>
                            <div className="rr-price-main">A${cash.toLocaleString()}</div>
                            {pts > 0 && <div className="rr-price-sub">+{pts.toLocaleString()} pts</div>}
                            {taxes > 0 && <div className="rr-price-sub">+A${taxes.toLocaleString()} taxes</div>}
                        </>
                    ) : (
                        <>
                            <div className="rr-price-main rr-price-pts">{pts.toLocaleString()} pts</div>
                            {taxes > 0 && <div className="rr-price-sub">+A${taxes.toLocaleString()} taxes</div>}
                        </>
                    )}
                </div>
                <button
                    className="rr-select-btn"
                    onClick={e => { e.stopPropagation(); onToggle(); }}
                >
                    {expanded ? '↑ Collapse' : 'Select →'}
                </button>
                <button className="rr-details-link" onClick={e => { e.stopPropagation(); onDetails ? onDetails() : onToggle(); }}>
                    {expanded ? 'Hide details' : 'Flight details'}
                </button>
            </div>
        </div>
    );
}
