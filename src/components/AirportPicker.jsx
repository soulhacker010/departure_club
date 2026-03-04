'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Keyboard-searchable airport dropdown
 * Shows all airports grouped by region, filterable by typing code or city name
 */
export default function AirportPicker({ airports, value, onChange, label }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Find current airport for display
    const selected = airports.find(a => a.code === value);
    const displayText = selected ? `${selected.code} — ${selected.city}` : value;

    // Filter airports by query
    const filtered = useMemo(() => {
        if (!query.trim()) return airports;
        const q = query.toLowerCase();
        return airports.filter(a =>
            a.code.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q) ||
            (a.country && a.country.toLowerCase().includes(q))
        );
    }, [query, airports]);

    // Group by region
    const grouped = useMemo(() => {
        const groups = {};
        filtered.forEach(a => {
            const region = a.region || 'Other';
            if (!groups[region]) groups[region] = [];
            groups[region].push(a);
        });
        // Sort: Oceania first, then by proximity relevance
        const order = ['Oceania', 'Asia', 'Europe', 'North America', 'South America', 'Africa', 'Other'];
        return order
            .filter(r => groups[r]?.length > 0)
            .map(r => ({ region: r, airports: groups[r] }));
    }, [filtered]);

    const regionLabels = {
        'Oceania': '🇦🇺 Australia, NZ & Pacific',
        'Asia': '🌏 Asia & Middle East',
        'Europe': '🇪🇺 Europe',
        'North America': '🇺🇸 North America',
        'South America': '🌎 South America',
        'Africa': '🌍 Africa',
    };

    // Close on outside click
    useEffect(() => {
        function handleClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function handleSelect(code) {
        onChange(code);
        setOpen(false);
        setQuery('');
    }

    return (
        <div className="airport-picker" ref={containerRef}>
            <label>{label}</label>
            <div
                className="airport-picker-trigger"
                onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
            >
                <span className="airport-picker-value">{displayText}</span>
                <span className="airport-picker-arrow">▾</span>
            </div>

            {open && (
                <div className="airport-picker-dropdown">
                    <input
                        ref={inputRef}
                        type="text"
                        className="airport-picker-search"
                        placeholder="Type airport code or city..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />
                    <div className="airport-picker-list">
                        {grouped.length === 0 && (
                            <div className="airport-picker-empty">No airports found</div>
                        )}
                        {grouped.map(group => (
                            <div key={group.region}>
                                <div className="airport-picker-region">{regionLabels[group.region] || group.region}</div>
                                {group.airports.map(a => (
                                    <div
                                        key={a.code}
                                        className={`airport-picker-option ${a.code === value ? 'selected' : ''}`}
                                        onClick={() => handleSelect(a.code)}
                                    >
                                        <span className="airport-code">{a.code}</span>
                                        <span className="airport-city">{a.city}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
