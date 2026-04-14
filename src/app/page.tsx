// @ts-nocheck
'use client';

import Navbar from '@/components/Navbar';

export default function Home() {
    return (
        <>
            <Navbar />
            <main className="lp-main">
                <section className="lp-section">

                    {/* ── Left: Hero copy ── */}
                    <div className="lp-hero">
                        <div className="lp-brand-label">DEPARTURE CLUB AI</div>
                        <h1 className="lp-headline">
                            The Seats You Didn't Know Existed.
                        </h1>
                        <p className="lp-body">
                            The most comprehensive AI reward seat finder built for everyday Australian travellers.
                        </p>
                        <p className="lp-body">
                            Departure Club AI combines reward availability with live cash fares to unlock routes traditional frequent flyer searches miss.
                        </p>
                        <p className="lp-body">
                            We analyse partner airlines, hub combinations, and fare arbitrage opportunities in real time — allowing you to see what others cannot.
                        </p>
                        <p className="lp-body lp-bold">
                            This is not a spreadsheet.<br />It is infrastructure.
                        </p>
                        <a href="/signup" className="lp-search-btn">
                            Get Started →
                        </a>
                    </div>

                    {/* ── Right: Pricing cards ── */}
                    <div className="lp-pricing-col">

                        {/* Annual */}
                        <div className="pc-card pc-card-featured">
                            <div className="pc-header">
                                <span className="pc-plan-label">ANNUAL PLAN</span>
                                <div className="pc-badges">
                                    <span className="pc-badge-saving">30% saving</span>
                                    <span className="pc-badge-prog">Qantas</span>
                                    <span className="pc-badge-prog">Velocity</span>
                                </div>
                            </div>
                            <div className="pc-price">
                                <span className="pc-amount">$500</span>
                                <span className="pc-period"> /year</span>
                            </div>
                            <ul className="pc-features">
                                <li>Yearly access to AI reward seat finder</li>
                                <li>Live seat alerts</li>
                                <li>Hybrid fare combinations</li>
                                <li>Multi-airline reward scanning</li>
                                <li>Departure Club community access</li>
                                <li>Daily AI deal feeds</li>
                            </ul>
                            <a href="/signup" className="pc-btn pc-btn-primary" style={{display:'block',textAlign:'center',textDecoration:'none'}}>
                                Get Started →
                            </a>
                        </div>

                        {/* Monthly */}
                        <div className="pc-card">
                            <div className="pc-header">
                                <span className="pc-plan-label">MONTHLY PLAN</span>
                            </div>
                            <div className="pc-price">
                                <span className="pc-amount">$49</span>
                                <span className="pc-period"> /month</span>
                            </div>
                            <ul className="pc-features">
                                <li>Monthly access to AI reward seat finder</li>
                                <li>Live seat alerts</li>
                                <li>Departure Club community access</li>
                                <li>Daily AI deal feeds</li>
                            </ul>
                            <a href="/signup" className="pc-btn pc-btn-secondary" style={{display:'block',textAlign:'center',textDecoration:'none'}}>
                                Get Started →
                            </a>
                        </div>

                    </div>
                </section>
            </main>

            <footer className="footer">
                <p>Departure Club © 2026 — Powered by Seats.aero Partner API</p>
            </footer>
        </>
    );
}
