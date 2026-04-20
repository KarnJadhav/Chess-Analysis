import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div style={{ background: '#23232a', minHeight: '100vh', color: '#fff', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      {/* Header/Navbar */}
      <header style={{ background: '#18181c', padding: '1.2rem 0', borderRadius: '18px 18px 0 0', margin: '2rem auto 0', maxWidth: 900, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 850, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Image src="/logo.png" alt="Logo" width={36} height={36} style={{ borderRadius: 8 }} />
            <span style={{ color: '#ffc857', fontWeight: 700, fontSize: 22 }}>Chanakya&apos;s Gambit</span>
          </div>
          <ul style={{ display: 'flex', gap: 32, listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }}>
            <li><Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Home</Link></li>
            <li><Link href="/openings" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Openings</Link></li>
            <li><Link href="/analytics" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Analytics</Link></li>
            <li><Link href="/play" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Play</Link></li>
            <li><Link href="/get-started" style={{ background: '#ffc857', color: '#23232a', fontWeight: 700, borderRadius: 8, padding: '0.5rem 1.2rem', textDecoration: 'none', marginLeft: 12 }}>Get Started</Link></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: 900, margin: '2rem auto 0', padding: '2rem 0 1rem' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, marginBottom: 12, lineHeight: 1.1 }}>
          Master <span style={{ color: '#ffc857' }}>Every Move</span> with Data
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#e0e0e0', marginBottom: 28 }}>
          Explore openings, analyze games, and discover strategy like you&apos;ve never have before.
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <input type="text" placeholder="Enter your Lichess Username" style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: 8, border: 'none', fontSize: '1rem', background: '#2d2d34', color: '#fff' }} />
          <button style={{ background: '#ffc857', color: '#23232a', fontWeight: 700, borderRadius: 8, padding: '0.7rem 1.2rem', fontSize: '1rem', border: 'none', cursor: 'pointer' }}>Analyze Profile →</button>
        </div>
        <div style={{ color: '#bdbdbd', fontSize: '0.95rem', marginBottom: 32 }}>Or upload a PGN file</div>

        {/* Feature Cards */}
        <div style={{ display: 'flex', gap: 18, justifyContent: 'space-between', marginBottom: 36 }}>
          <div style={{ background: '#18181c', border: '2px solid #ffc857', borderRadius: 12, flex: 1, padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>♟️</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffc857' }}>Opening Explorer</div>
            <div style={{ color: '#e0e0e0', fontSize: '0.98rem', marginTop: 4 }}>Win rates and trends.</div>
          </div>
          <div style={{ background: '#18181c', border: '2px solid #ffc857', borderRadius: 12, flex: 1, padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>♞</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffc857' }}>Game Analytics</div>
            <div style={{ color: '#e0e0e0', fontSize: '0.98rem', marginTop: 4 }}>Blunders, accuracy, stats.</div>
          </div>
          <div style={{ background: '#18181c', border: '2px solid #ffc857', borderRadius: 12, flex: 1, padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>♚</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffc857' }}>AI Predictions</div>
            <div style={{ color: '#e0e0e0', fontSize: '0.98rem', marginTop: 4 }}>Outcome forecasts.</div>
          </div>
          <div style={{ background: '#18181c', border: '2px solid #ffc857', borderRadius: 12, flex: 1, padding: '1.2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>♜</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffc857' }}>Interactive Board</div>
            <div style={{ color: '#e0e0e0', fontSize: '0.98rem', marginTop: 4 }}>Replay and learn.</div>
          </div>
        </div>

        {/* Data Visualization Preview */}
        <div style={{ background: '#18181c', borderRadius: 12, padding: '1.5rem', marginBottom: 32 }}>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 18, textAlign: 'center' }}>Data Visualization Preview</h2>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Bar Chart */}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#ffc857', fontWeight: 600, marginBottom: 8 }}>Most Popular Openings</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', color: '#e0e0e0' }}>
                  <span>Sicilian</span><span>80%</span>
                </div>
                <div style={{ background: '#ffc857', height: 8, borderRadius: 4, width: '80%' }}></div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', color: '#e0e0e0' }}>
                  <span>Ruy Lopez</span><span>76%</span>
                </div>
                <div style={{ background: '#ffc857', height: 8, borderRadius: 4, width: '76%' }}></div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', color: '#e0e0e0' }}>
                  <span>Caro-Kann</span><span>50%</span>
                </div>
                <div style={{ background: '#ffc857', height: 8, borderRadius: 4, width: '50%' }}></div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', color: '#e0e0e0' }}>
                  <span>Queen&apos;s Gambit</span><span>70%</span>
                </div>
                <div style={{ background: '#ffc857', height: 8, borderRadius: 4, width: '70%' }}></div>
              </div>
            </div>
            {/* Chessboard Preview */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ color: '#ffc857', fontWeight: 600, marginBottom: 8 }}>Chessboard</div>
              <div style={{ width: 120, height: 120, background: 'repeating-linear-gradient(135deg, #23232a 0 15px, #ffc857 15px 30px)', borderRadius: 8, position: 'relative', marginBottom: 8 }}>
                <span style={{ position: 'absolute', left: 48, top: 48, fontSize: 32 }}>♞</span>
                <svg width="120" height="120" style={{ position: 'absolute', left: 0, top: 0 }}>
                  <line x1="20" y1="100" x2="100" y2="20" stroke="#ffc857" strokeWidth="3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#18181c', borderRadius: '0 0 18px 18px', maxWidth: 900, margin: '0 auto', padding: '1rem 0', textAlign: 'center', color: '#bdbdbd', fontSize: '1rem' }}>
        <div style={{ marginBottom: 6 }}>
          <Link href="https://github.com" style={{ color: '#ffc857', textDecoration: 'none', marginRight: 16 }}>Github</Link>
          <Link href="https://kaggle.com" style={{ color: '#ffc857', textDecoration: 'none', marginRight: 16 }}>Kaggle Datasets</Link>
          <Link href="#" style={{ color: '#ffc857', textDecoration: 'none' }}>Credits</Link>
        </div>
        <div style={{ fontSize: '0.95rem', marginTop: 4 }}>&copy; 2024 Chanakya&apos;s Gambit</div>
      </footer>
    </div>
  );
}
