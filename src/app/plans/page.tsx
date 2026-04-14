// @ts-nocheck
'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';

export default function PlansPage() {
    const [selected, setSelected] = useState('annual');

    function handleContinue() {
        // TODO: create Stripe checkout session for selected plan
        // For now — no payment backend yet, go straight to search
        window.location.href = '/search';
    }

    return (
        <>
            <Navbar />
            <main className="auth-main">
                <div className="plans-card">

                    <a href="/" className="auth-brand">DEPARTURE CLUB</a>
                    <h1 className="auth-heading">Choose your plan</h1>
                    <p className="auth-sub">You can cancel or change plans anytime.</p>

                    <div className="plans-grid">

                        {/* Annual */}
                        <button
                            type="button"
                            className={`plan-opt ${selected === 'annual' ? 'plan-opt-active' : ''}`}
                            onClick={() => setSelected('annual')}
                        >
                            <div className="plan-opt-top">
                                <span className="plan-opt-name">Annual</span>
                                <span className="plan-opt-save">30% off</span>
                            </div>
                            <div className="plan-opt-price">
                                $500<span className="plan-opt-period">/year</span>
                            </div>
                            <div className="plan-opt-monthly">~$41/month</div>
                            <ul className="plan-opt-features">
                                <li>AI reward seat finder</li>
                                <li>Live seat alerts</li>
                                <li>Hybrid fare combinations</li>
                                <li>Multi-airline scanning</li>
                                <li>Community access</li>
                                <li>Daily AI deal feeds</li>
                            </ul>
                            <div className={`plan-opt-check ${selected === 'annual' ? 'plan-opt-check-active' : ''}`}>
                                {selected === 'annual' ? '✓' : ''}
                            </div>
                        </button>

                        {/* Monthly */}
                        <button
                            type="button"
                            className={`plan-opt ${selected === 'monthly' ? 'plan-opt-active' : ''}`}
                            onClick={() => setSelected('monthly')}
                        >
                            <div className="plan-opt-top">
                                <span className="plan-opt-name">Monthly</span>
                            </div>
                            <div className="plan-opt-price">
                                $49<span className="plan-opt-period">/month</span>
                            </div>
                            <div className="plan-opt-monthly">billed monthly</div>
                            <ul className="plan-opt-features">
                                <li>AI reward seat finder</li>
                                <li>Live seat alerts</li>
                                <li>Community access</li>
                                <li>Daily AI deal feeds</li>
                            </ul>
                            <div className={`plan-opt-check ${selected === 'monthly' ? 'plan-opt-check-active' : ''}`}>
                                {selected === 'monthly' ? '✓' : ''}
                            </div>
                        </button>

                    </div>

                    <button className="auth-submit-btn" onClick={handleContinue}>
                        Continue with {selected === 'annual' ? 'Annual — $500/yr' : 'Monthly — $49/mo'}
                    </button>

                    <p className="plans-secure">
                        🔒 Secure payment via Stripe · Cancel anytime
                    </p>

                </div>
            </main>
        </>
    );
}
