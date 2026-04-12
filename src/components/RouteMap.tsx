// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { getCoords } from '@/lib/airports';
import { getAirlineLogoUrl } from '@/lib/constants';

export default function RouteMap({ results, selectedRoute }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const layersRef = useRef([]);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || mapInstance.current) return;

        const L = require('leaflet');

        const map = L.map(mapRef.current, {
            center: [15, 80],
            zoom: 3,
            zoomControl: true,
            scrollWheelZoom: true,
            attributionControl: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
        }).addTo(map);

        mapInstance.current = map;
        setMapReady(true);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Draw route lines with animation
    useEffect(() => {
        if (!mapReady || !mapInstance.current) return;
        const L = require('leaflet');
        const map = mapInstance.current;

        // Clear existing layers
        layersRef.current.forEach(l => map.removeLayer(l));
        layersRef.current = [];

        const routeToDraw = selectedRoute || (results.length > 0 ? results[0] : null);
        if (!routeToDraw || !routeToDraw.legs) return;

        const allPoints = [];

        routeToDraw.legs.forEach((leg, legIndex) => {
            const from = getCoords(leg.origin);
            const to = getCoords(leg.destination);
            if (!from || !to) return;

            allPoints.push(from, to);

            // Animated line — interpolate points for smooth drawing
            const steps = 40;
            const animatedPoints = [];
            for (let step = 0; step <= steps; step++) {
                const t = step / steps;
                animatedPoints.push([
                    from[0] + (to[0] - from[0]) * t,
                    from[1] + (to[1] - from[1]) * t,
                ]);
            }

            const color = leg.isCash ? '#4d8af0' : '#d4af37';
            const delay = legIndex * 600;

            setTimeout(() => {
                // Draw animated line
                const line = L.polyline([], {
                    color,
                    weight: 3,
                    opacity: 0.9,
                    dashArray: leg.isCash ? '8, 8' : null,
                }).addTo(map);
                layersRef.current.push(line);

                let frame = 0;
                function animateLine() {
                    if (frame <= steps) {
                        line.setLatLngs(animatedPoints.slice(0, frame + 1));
                        frame++;
                        requestAnimationFrame(animateLine);
                    }
                }
                animateLine();

                // Origin marker
                const originMarker = L.circleMarker(from, {
                    radius: 7,
                    fillColor: '#d4af37',
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 1,
                    className: 'animated-marker',
                }).addTo(map).bindTooltip(leg.origin, { permanent: false, className: 'map-tooltip' });
                layersRef.current.push(originMarker);

                // Destination marker
                const destMarker = L.circleMarker(to, {
                    radius: 7,
                    fillColor: leg.isCash ? '#4d8af0' : '#00d68f',
                    color: '#fff',
                    weight: 2,
                    fillOpacity: 1,
                    className: 'animated-marker',
                }).addTo(map).bindTooltip(leg.destination, { permanent: false, className: 'map-tooltip' });
                layersRef.current.push(destMarker);

                // Glow ring
                const glowRing = L.circleMarker(from, {
                    radius: 14,
                    fillColor: 'transparent',
                    color: '#d4af37',
                    weight: 1,
                    opacity: 0.3,
                }).addTo(map);
                layersRef.current.push(glowRing);

                // Airline logo at midpoint of route segment
                const airlineCode = leg.airlines ? leg.airlines.split(',')[0].trim().toUpperCase() : null;
                const logoUrl = airlineCode ? getAirlineLogoUrl(airlineCode) : null;
                if (logoUrl) {
                    const midLat = (from[0] + to[0]) / 2;
                    const midLng = (from[1] + to[1]) / 2;
                    const logoIcon = L.divIcon({
                        className: 'map-airline-logo-wrapper',
                        html: `<img src="${logoUrl}" alt="${airlineCode}" class="map-airline-logo" onerror="this.parentElement.style.display='none'" />`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 16],
                    });
                    const logoMarker = L.marker([midLat, midLng], { icon: logoIcon, interactive: true })
                        .addTo(map)
                        .bindTooltip(airlineCode, { permanent: false, className: 'map-tooltip' });
                    layersRef.current.push(logoMarker);
                }
            }, delay);
        });

        // Fit bounds after animation
        setTimeout(() => {
            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints);
                map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.0 });
            }
        }, routeToDraw.legs.length * 600 + 200);

    }, [results, selectedRoute, mapReady]);

    return (
        <>
            <div ref={mapRef} id="map" />
            <div className="map-overlay-stats">
                <div className="map-stat-chip">
                    <span className="dot dot-gold" />
                    Reward
                </div>
                <div className="map-stat-chip">
                    <span className="dot dot-blue" />
                    Cash
                </div>
                <div className="map-stat-chip">
                    <span className="dot dot-green" />
                    Destination
                </div>
            </div>
        </>
    );
}
