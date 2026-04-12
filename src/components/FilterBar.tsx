// @ts-nocheck
'use client';

import { useState, useRef, useEffect } from 'react';

const SORT_OPTIONS = [
    { key: null, label: 'Default', icon: '📋' },
    { key: 'reward-only', label: 'Reward Only', icon: '⭐', isFilter: true },
    { key: 'cash-fares', label: 'Cash Fares', icon: '💵', isFilter: true },
    { key: 'fastest', label: 'Fastest', icon: '⚡' },
    { key: 'cheapest', label: 'Cheapest', icon: '💰' },
    { key: 'lowest-points', label: 'Total Points', icon: '🎯' },
    { key: 'fewest-layovers', label: 'Fewest Layovers', icon: '✈️' },
];

export default function FilterBar({ filters, onChange }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentSort = SORT_OPTIONS.find(o => o.key === filters.sortBy) || SORT_OPTIONS[0];

    function handleSelect(key) {
        // For filter-type options (Reward Only, Cash Fares), set type filter
        const option = SORT_OPTIONS.find(o => o.key === key);
        if (option?.isFilter) {
            onChange({
                ...filters,
                sortBy: null,
                type: filters.type === key ? null : key,
            });
        } else {
            onChange({
                ...filters,
                sortBy: filters.sortBy === key ? null : key,
                type: null,
            });
        }
        setOpen(false);
    }

    // Build display label
    const activeOption = filters.type
        ? SORT_OPTIONS.find(o => o.key === filters.type)
        : currentSort;
    const displayLabel = activeOption?.label || 'Sort by';
    const displayIcon = activeOption?.icon || '📋';

    return (
        <div className="sort-dropdown-wrapper" ref={dropdownRef}>
            <button
                className={`sort-dropdown-trigger ${(filters.sortBy || filters.type) ? 'active' : ''}`}
                onClick={() => setOpen(!open)}
            >
                <span className="sort-dropdown-icon">{displayIcon}</span>
                <span className="sort-dropdown-label">{displayLabel}</span>
                <span className={`sort-dropdown-arrow ${open ? 'open' : ''}`}>▾</span>
            </button>
            {open && (
                <div className="sort-dropdown-menu">
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.key || 'default'}
                            className={`sort-dropdown-item ${(filters.sortBy === opt.key && !opt.isFilter) ||
                                    (filters.type === opt.key && opt.isFilter)
                                    ? 'active' : ''
                                }`}
                            onClick={() => handleSelect(opt.key)}
                        >
                            <span className="sort-item-icon">{opt.icon}</span>
                            <span className="sort-item-label">{opt.label}</span>
                            {((filters.sortBy === opt.key && !opt.isFilter) ||
                                (filters.type === opt.key && opt.isFilter)) && (
                                    <span className="sort-item-check">✓</span>
                                )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
