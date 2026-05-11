// 'use client';
// import styles from './index.module.css';
// import type { NextPage } from 'next';
// import React, { useState, FC, ReactNode } from 'react';
// import { motion } from 'framer-motion';

// // --- SVG Icon Components ---
// // Replacing react-icons with inline SVGs to remove dependency issues.

// const FiDatabase: FC = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
//     <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
//     <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
//   </svg>
// );

// const FiBarChart2: FC = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <line x1="18" y1="20" x2="18" y2="10"></line>
//     <line x1="12" y1="20" x2="12" y2="4"></line>
//     <line x1="6" y1="20" x2="6" y2="14"></line>
//   </svg>
// );

// const FiCpu: FC = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
//     <rect x="9" y="9" width="6" height="6"></rect>
//     <line x1="9" y1="1" x2="9" y2="4"></line>
//     <line x1="15" y1="1" x2="15" y2="4"></line>
//     <line x1="9" y1="20" x2="9" y2="23"></line>
//     <line x1="15" y1="20" x2="15" y2="23"></line>
//     <line x1="20" y1="9" x2="23" y2="9"></line>
//     <line x1="20" y1="14" x2="23" y2="14"></line>
//     <line x1="1" y1="9" x2="4" y2="9"></line>
//     <line x1="1" y1="14" x2="4" y2="14"></line>
//   </svg>
// );

// const FiPlayCircle: FC = () => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <circle cx="12" cy="12" r="10"></circle>
//     <polygon points="10 8 16 12 10 16 10 8"></polygon>
//   </svg>
// );


// // Animation variants for Framer Motion to orchestrate the entrance animations.
// const containerVariants = {
//   hidden: { opacity: 0 },
//   visible: {
//     opacity: 1,
//     transition: { staggerChildren: 0.1, delayChildren: 0.2 },
//   },
// };

// const itemVariants = {
//   hidden: { y: 20, opacity: 0 },
//   visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } },
// };

// // A reusable component for displaying feature cards, making the code cleaner.
// interface FeatureCardProps {
//     icon: ReactNode;
//     title: string;
//     description: string;
// }

// const FeatureCard: FC<FeatureCardProps> = ({ icon, title, description }) => (
//   <motion.div
//     className="bg-slate-800 p-6 rounded-xl text-center border border-slate-700 hover:border-indigo-500 hover:bg-slate-700/50 transition-all duration-300"
//     variants={itemVariants}
//     whileHover={{ y: -5 }}
//   >
//     <div className="flex justify-center text-4xl text-indigo-400 mb-4">{icon}</div>
//     <h3 className="text-xl font-bold text-white font-heading mb-2">{title}</h3>
//     <p className="text-slate-400">{description}</p>
//   </motion.div>
// );


// const Home: NextPage = () => {
//   const [username, setUsername] = useState('');

//   return (
//   <div className={styles.heroSection}>
//       {/* A Navbar component would typically go in a separate layout file, but is omitted here for a single-file component. */}
      
//   <main>
//         {/* Hero Section: The main attention-grabbing part of the page. */}
//   <section className={styles.heroSection}>
//           {/* Subtle gradient background effect instead of a local file */}
//           <div className={styles.heroBackgroundGradient}>
//             <div></div>
//             <div></div>
//           </div>
          
//           <motion.div
//             className={styles.heroContent}
//             initial="hidden"
//             animate="visible"
//             variants={containerVariants}
//           >
//             <motion.h1
//               className={styles.heroTitle}
//               variants={itemVariants}
//             >
//               Master Every Move with Data
//             </motion.h1>
//             <motion.p
//               className={styles.heroSubtitle}
//               variants={itemVariants}
//             >
//               Explore openings, analyze your games, and discover winning strategies like never before.
//             </motion.p>
//             <motion.div
//               className={styles.inputGroup}
//               variants={itemVariants}
//             >
//               <input
//                 type="text"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 placeholder="Enter your Lichess Username"
//                 className={styles.lichessInput}
//               />
//               <a href={username ? `/dashboard?user=${username}` : '#'} >
//                 <button 
//                   disabled={!username}
//                   className={styles.analyzeButton}
//                 >
//                   Analyze Profile →
//                 </button>
//               </a>
//             </motion.div>
//             <motion.p className={styles.uploadLink} variants={itemVariants}>
//               Or <a href="/upload">upload a PGN file</a>.
//             </motion.p>
//           </motion.div>
//         </section>

//         {/* Features Section: Highlights the key functionalities of the application. */}
//         <section className={styles.featuresSection}>
//           <motion.div 
//             className={styles.featuresContainer}
//             initial="hidden"
//             whileInView="visible"
//             viewport={{ once: true, amount: 0.3 }}
//             variants={containerVariants}
//           >
//             <h2 className={styles.featuresTitle}>Why Use Chanakya&apos;s Gambit?</h2>
//             <div className={styles.featuresGrid}>
//               <FeatureCard
//                 icon={<FiDatabase />}
//                 title="Opening Explorer"
//                 description="Analyze win rates and trends from millions of master games."
//               />
//               <FeatureCard
//                 icon={<FiBarChart2 />}
//                 title="Game Analytics"
//                 description="Identify blunders, accuracy, and key performance statistics."
//               />
//               <FeatureCard
//                 icon={<FiCpu />}
//                 title="AI Predictions"
//                 description="Get outcome forecasts and move-by-move engine analysis."
//               />
//               <FeatureCard
//                 icon={<FiPlayCircle />}
//                 title="Interactive Board"
//                 description="Replay your games and learn from critical moments."
//               />
//             </div>
//           </motion.div>
//         </section>

//         {/* Data Visualization Preview: A teaser for the data charts in the dashboard. */}
//         <section className={styles.vizContainer}>
//             <div>
//                  <h2 className={styles.vizTitle}>Visualize Your Progress</h2>
//                  <p className={styles.vizSubtitle}>Turn game data into actionable insights with beautiful, easy-to-understand charts and graphs.</p>
//                  {/* This is a placeholder for your chart component. */}
//                  <div className={styles.vizPlaceholder}>
//                    <p className={styles.vizPlaceholderTitle}>📈 Chart Component Goes Here</p>
//                    <p className={styles.vizPlaceholderSubtitle}>Integrate a library like Recharts or Chart.js to display dynamic data from your analysis.</p>
//                  </div>
//             </div>
//         </section>
//       </main>

//       {/* Footer: Contains copyright and helpful links. */}
//       <footer className={styles.footer}>
//         <p className={styles.footerCopyright}>© {new Date().getFullYear()} Chanakya&apos;s Gambit</p>
//         <div className={styles.footerLinks}>
//             <a href="#">GitHub</a>
//             <a href="#">Kaggle Datasets</a>
//             <a href="#">Credits</a>
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default Home;

'use client';
import styles from './index.module.css';
import type { NextPage } from 'next';
import React, { useState, useEffect, FC, ReactNode, FormEvent } from 'react';
import { motion } from 'framer-motion';

// --- SVG Icon Components (Unchanged) ---
// These are well-defined and optimized.
const FiDatabase: FC = () => (
  <svg xmlns="http://www.w.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);
const FiBarChart2: FC = () => (
  <svg xmlns="http://www.w.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);
const FiCpu: FC = () => (
  <svg xmlns="http://www.w.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
    <line x1="20" y1="9" x2="23" y2="9"></line>
    <line x1="20" y1="14" x2="23" y2="14"></line>
    <line x1="1" y1="9" x2="4" y2="9"></line>
    <line x1="1" y1="14" x2="4" y2="14"></line>
  </svg>
);
const FiPlayCircle: FC = () => (
  <svg xmlns="http://www.w.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="10 8 16 12 10 16 10 8"></polygon>
  </svg>
);

// --- Animation Variants (Unchanged) ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { stiffness: 100 } },
};

// --- IMPROVED FeatureCard Component ---
// Now uses CSS Modules for consistent styling.
interface FeatureCardProps {
    icon: ReactNode;
    title: string;
    description: string;
}

const FeatureCard: FC<FeatureCardProps> = ({ icon, title, description }) => (
  <motion.div
    className={styles.featureCard}
    variants={itemVariants}
    whileHover={{ y: -5, scale: 1.03 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    <div className={styles.featureCardIcon}>{icon}</div>
    <h3 className={styles.featureCardTitle}>{title}</h3>
    <p className={styles.featureCardDescription}>{description}</p>
  </motion.div>
);

type ChessComProfileData = {
  profile: {
    username: string;
    avatar: string | null;
    country: string | null;
    title: string | null;
    followers: number | null;
    joined: number | null;
    status: string | null;
  };
  ratings: {
    rapid: number | null;
    blitz: number | null;
    bullet: number | null;
  };
  stats: {
    rapid: { win?: number; loss?: number; draw?: number } | null;
    blitz: { win?: number; loss?: number; draw?: number } | null;
    bullet: { win?: number; loss?: number; draw?: number } | null;
  };
  games: Array<{
    url: string | null;
    endTime: number | null;
    timeClass: string | null;
    result: 'win' | 'loss' | 'draw';
    opponent: { username: string | null; rating: number | null };
    side: 'white' | 'black';
    moves: number | null;
  }>;
  insights: {
    playStyle: string;
    bestFormat: string | null;
    winRate: number;
    drawRate: number;
    lossRate: number;
    averageOpponentRating: number | null;
    preferredFirstMove: string | null;
    summary: string;
  };
};

// --- IMPROVED Home Page Component ---
const Home: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState<ChessComProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    function handleLoad() {
      setIsLoading(false);
    }

    if (document.readyState === 'complete') {
      setIsLoading(false);
      return;
    }

    window.addEventListener('load', handleLoad);
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setProfileLoading(true);
    setProfileError(null);
    setProfileData(null);

    try {
      const res = await fetch(`/api/chesscom/profile?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load profile');
      }
      setProfileData(data as ChessComProfileData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setProfileError(message);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {isLoading && (
        <div className={styles.preloader}>
          <div className={styles.preloaderCard}>
            <div className={styles.preloaderMark}>C</div>
            <div className={styles.preloaderText}>Chanakya loading</div>
          </div>
        </div>
      )}
      <main>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroBackgroundGradient} aria-hidden="true">
            <div></div>
            <div></div>
          </div>
          
          <motion.div
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.h1 className={styles.heroTitle} variants={itemVariants}>
              Master Every Move with Data
            </motion.h1>
            <motion.p className={styles.heroSubtitle} variants={itemVariants}>
              Analyze any Chess.com player and surface strengths, weaknesses, and patterns in minutes.
            </motion.p>
            
            <motion.form
              className={styles.inputGroup}
              variants={itemVariants}
              onSubmit={handleAnalyze}
            >
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Chess.com username"
                className={styles.lichessInput}
                aria-label="Chess.com Username"
              />
              <button 
                type="submit"
                disabled={!username || profileLoading}
                className={styles.analyzeButton}
              >
                {profileLoading ? 'Analyzing...' : 'Analyze Profile →'}
              </button>
            </motion.form>
          </motion.div>
        </section>

        <motion.section
          className={styles.profileSection}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={containerVariants}
        >
          <motion.div className={styles.profileShell} variants={itemVariants}>
            <div className={styles.profileHeader}>
              <div>
                <p className={styles.profileEyebrow}>Profile Intelligence</p>
                <h2 className={styles.profileTitle}>Chess.com Profile Analyzer</h2>
                <p className={styles.profileSubtitle}>Minimal, focused insights with recent performance and play style signals.</p>
              </div>
              {profileError && <div className={styles.profileError}>{profileError}</div>}
            </div>

            {!profileData && !profileLoading && (
              <div className={styles.profileEmpty}>Enter a username above to load a profile snapshot.</div>
            )}

            {profileData && (
              <div className={styles.profileGrid}>
                <div className={styles.profileCard}>
                  <div className={styles.profileIdentity}>
                    <div className={styles.profileAvatar}>
                      {profileData.profile.avatar ? (
                        <img src={profileData.profile.avatar} alt={profileData.profile.username} />
                      ) : (
                        <span>{profileData.profile.username.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className={styles.profileName}>
                        {profileData.profile.title ? `${profileData.profile.title} ` : ''}{profileData.profile.username}
                      </div>
                      <div className={styles.profileMeta}>
                        <span>{profileData.profile.country ?? 'Country N/A'}</span>
                        <span className={styles.profileDot}></span>
                        <span>{profileData.profile.status ?? 'Status N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.profileStatsRow}>
                    <div>
                      <p>Followers</p>
                      <span>{profileData.profile.followers ?? '—'}</span>
                    </div>
                    <div>
                      <p>Joined</p>
                      <span>{profileData.profile.joined ? new Date(profileData.profile.joined * 1000).getFullYear() : '—'}</span>
                    </div>
                    <div>
                      <p>Best Format</p>
                      <span>{profileData.insights.bestFormat ?? '—'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.ratingsCard}>
                  <div className={styles.cardTitle}>Ratings</div>
                  <div className={styles.ratingsGrid}>
                    <div>
                      <p>Rapid</p>
                      <span>{profileData.ratings.rapid ?? '—'}</span>
                    </div>
                    <div>
                      <p>Blitz</p>
                      <span>{profileData.ratings.blitz ?? '—'}</span>
                    </div>
                    <div>
                      <p>Bullet</p>
                      <span>{profileData.ratings.bullet ?? '—'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.insightsCard}>
                  <div className={styles.cardTitle}>Insights</div>
                  <div className={styles.insightsGrid}>
                    <div>
                      <p>Play Style</p>
                      <span>{profileData.insights.playStyle}</span>
                    </div>
                    <div>
                      <p>Win Rate</p>
                      <span>{profileData.insights.winRate}%</span>
                    </div>
                    <div>
                      <p>Draw Rate</p>
                      <span>{profileData.insights.drawRate}%</span>
                    </div>
                    <div>
                      <p>Avg Opponent</p>
                      <span>{profileData.insights.averageOpponentRating ?? '—'}</span>
                    </div>
                    <div>
                      <p>Preferred First Move</p>
                      <span>{profileData.insights.preferredFirstMove ?? '—'}</span>
                    </div>
                  </div>
                  <div className={styles.insightsSummary}>{profileData.insights.summary}</div>
                </div>

                <div className={styles.gamesCard}>
                  <div className={styles.cardTitle}>Recent Games</div>
                  {profileData.games.length === 0 ? (
                    <div className={styles.profileEmpty}>No recent games available.</div>
                  ) : (
                    <ul className={styles.gamesList}>
                      {profileData.games.slice(0, 6).map((game, index) => (
                        <li key={`${game.url ?? 'game'}-${index}`}>
                          <div>
                            <span className={styles.gameResult} data-result={game.result}>{game.result}</span>
                            <span className={styles.gameOpponent}>vs {game.opponent.username ?? 'Unknown'}</span>
                          </div>
                          <span className={styles.gameMeta}>
                            {game.timeClass ?? '—'} · {game.opponent.rating ?? '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.section>

        {/* Features Section */}
        <section className={styles.featuresSection}>
          <motion.div 
            className={styles.featuresContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            <h2 className={styles.featuresTitle}>Why Use Chanakya&apos;s Gambit?</h2>
            <div className={styles.featuresGrid}>
              <FeatureCard
                icon={<FiDatabase />}
                title="Opening Explorer"
                description="Analyze win rates and trends from millions of master games."
              />
              <FeatureCard
                icon={<FiBarChart2 />}
                title="Game Analytics"
                description="Identify blunders, accuracy, and key performance statistics."
              />
              <FeatureCard
                icon={<FiCpu />}
                title="AI Predictions"
                description="Get outcome forecasts and move-by-move engine analysis."
              />
              <FeatureCard
                icon={<FiPlayCircle />}
                title="Interactive Board"
                description="Replay your games and learn from critical moments."
              />
            </div>
          </motion.div>
        </section>

        {/* Data Visualization Preview Section */}
        <motion.section
          className={styles.vizSection}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <motion.div className={styles.vizContainer} variants={itemVariants}>
            <h2 className={styles.vizTitle}>Visualize Your Progress</h2>
            <p className={styles.vizSubtitle}>Turn game data into actionable insights with beautiful, easy-to-understand charts and graphs.</p>
            <div className={styles.vizPlaceholder}>
              <p className={styles.vizPlaceholderTitle}>📈 Chart Component Goes Here</p>
              <p className={styles.vizPlaceholderSubtitle}>Integrate a library like Recharts or Chart.js to display dynamic data.</p>
            </div>
          </motion.div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Chanakya&apos;s Gambit</p>
        <div className={styles.footerLinks}>
            <a href="#">GitHub</a>
            <a href="#">Kaggle Datasets</a>
            <a href="#">Credits</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;