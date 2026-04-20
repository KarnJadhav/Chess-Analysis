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
import React, { useState, FC, ReactNode, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Using next/navigation for App Router
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

// --- IMPROVED Home Page Component ---
const Home: NextPage = () => {
  const [username, setUsername] = useState('');
  const router = useRouter();

  // IMPROVEMENT: Handles navigation programmatically for better semantics and accessibility.
  const handleAnalyze = (e: FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (username) {
      router.push(`/dashboard?user=${username}`);
    }
  };

  return (
    <div className={styles.pageWrapper}>
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
              Explore openings, analyze your games, and discover winning strategies like never before.
            </motion.p>
            
            {/* IMPROVEMENT: Replaced <a> tag with a proper <form> element. */}
            <motion.form
              className={styles.inputGroup}
              variants={itemVariants}
              onSubmit={handleAnalyze}
            >
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Lichess Username"
                className={styles.lichessInput}
                aria-label="Lichess Username"
              />
              <button 
                type="submit"
                disabled={!username}
                className={styles.analyzeButton}
              >
                Analyze Profile →
              </button>
            </motion.form>
          </motion.div>
        </section>

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
        <section className={styles.vizSection}>
            <div className={styles.vizContainer}>
                <h2 className={styles.vizTitle}>Visualize Your Progress</h2>
                <p className={styles.vizSubtitle}>Turn game data into actionable insights with beautiful, easy-to-understand charts and graphs.</p>
                <div className={styles.vizPlaceholder}>
                  <p className={styles.vizPlaceholderTitle}>📈 Chart Component Goes Here</p>
                  <p className={styles.vizPlaceholderSubtitle}>Integrate a library like Recharts or Chart.js to display dynamic data.</p>
                </div>
            </div>
        </section>
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