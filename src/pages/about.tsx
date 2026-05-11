import styles from './about.module.css';

const values = [
  {
    title: 'Human-first analysis',
    description: 'We translate engine precision into language players can act on, balancing tactics with context.'
  },
  {
    title: 'Signal over noise',
    description: 'We surface patterns and critical moments so training time goes to the moves that matter.'
  },
  {
    title: 'Crafted for momentum',
    description: 'Every insight is designed to feel motivating, not overwhelming.'
  }
];

const timeline = [
  {
    year: '2024',
    title: 'The spark',
    text: 'We began prototyping a chess review flow that feels like coaching, not homework.'
  },
  {
    year: '2025',
    title: 'Signal layers',
    text: 'Hybrid evaluation, tactical weighting, and humanized accuracy turned raw evals into a clear story.'
  },
  {
    year: '2026',
    title: 'The studio',
    text: 'A polished analysis experience that helps players build repeatable improvement loops.'
  }
];

const stats = [
  { label: 'Moves analyzed', value: '2.4M+' },
  { label: 'Blunders prevented', value: '310K+' },
  { label: 'Brilliant finds', value: '18K+' }
];

export default function About() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true"></div>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>About Chanakya</p>
          <h1 className={styles.title}>We turn chess analysis into a clear, human story.</h1>
          <p className={styles.subtitle}>
            Chanakya is built for players who want to improve fast without drowning in engine lines. We
            highlight the moments that change the game, explain why they matter, and help you build
            stronger habits.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primary}>Start a review</button>
            <button className={styles.secondary}>See the methodology</button>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.panelHeader}>
            <span>Analysis layers</span>
            <span className={styles.panelBadge}>Live</span>
          </div>
          <div className={styles.panelGrid}>
            <div>
              <p>Hybrid eval</p>
              <strong>Context + tactics</strong>
            </div>
            <div>
              <p>Human ACPL</p>
              <strong>Win-probability</strong>
            </div>
            <div>
              <p>Brilliant filter</p>
              <strong>Surprise + sacrifice</strong>
            </div>
            <div>
              <p>Critical nodes</p>
              <strong>Only-move alerts</strong>
            </div>
          </div>
          <div className={styles.panelFooter}>
            Built for clarity. Tuned for progress.
          </div>
        </div>
      </header>

      <section className={`${styles.section} ${styles.aboutSection}`}>
        <div className={styles.sectionHeader}>
          <h2>About Us</h2>
          <p>The builder behind Chanakya, focused on modern full-stack engineering and AI tooling.</p>
        </div>
        <div className={styles.developerCard}>
          <div className={styles.developerHeader}>
            <div>
              <p className={styles.developerEyebrow}>Developer Info</p>
              <h3 className={styles.developerName}>Karnsinh Jadhav</h3>
              <p className={styles.developerRole}>Full-Stack Developer • AI Enthusiast • React & Next.js Developer</p>
            </div>
            <div className={styles.developerBadge}>CSE 2026</div>
          </div>
          <p className={styles.developerSummary}>
            Computer Science Engineering student passionate about building scalable full-stack applications,
            AI-powered platforms, and modern web experiences. Experienced in React, Next.js, Node.js, MongoDB,
            AI integrations, and responsive frontend development.
          </p>
          <div className={styles.developerColumns}>
            <div className={styles.developerColumn}>
              <h4>Skills</h4>
              <div className={styles.chipList}>
                {[
                  'React.js',
                  'Next.js',
                  'Node.js',
                  'MongoDB',
                  'TypeScript',
                  'Tailwind CSS',
                  'JavaScript',
                  'Docker',
                  'Postman',
                  'Git & GitHub',
                  'AI/ML',
                  'REST APIs'
                ].map((skill) => (
                  <span key={skill} className={styles.chip}>{skill}</span>
                ))}
              </div>
            </div>
            <div className={styles.developerColumn}>
              <h4>Featured Projects</h4>
              <ul className={styles.projectList}>
                <li>
                  <strong>Travelogue</strong>
                  <span>AI-powered travel platform with JWT/OAuth authentication, real-time search, Socket.io messaging, and AI itinerary planning.</span>
                </li>
                <li>
                  <strong>KnightLab</strong>
                  <span>AI-based chess analysis platform using Stockfish NNUE with move review, accuracy scoring, opening detection, and interactive visualizations.</span>
                </li>
                <li>
                  <strong>Deepfake Detection System</strong>
                  <span>EfficientNetB3-powered deepfake detection platform with high-accuracy predictions and real-time analysis dashboard.</span>
                </li>
              </ul>
            </div>
            <div className={styles.developerColumn}>
              <h4>Experience</h4>
              <ul className={styles.projectList}>
                <li>
                  <strong>DevMinds Software Intern</strong>
                  <span>Worked on React and Next.js frontend development, API integration, and responsive UI optimization.</span>
                </li>
                <li>
                  <strong>IIT Bombay EdTech Internship Program</strong>
                  <span>Contributed to PrepBuddy, a collaborative gamified placement preparation platform with multilingual support and interactive learning features.</span>
                </li>
              </ul>
            </div>
            <div className={styles.developerColumn}>
              <h4>Education</h4>
              <div className={styles.educationBlock}>
                <strong>B.Tech in Computer Science & Engineering</strong>
                <span>D. Y. Patil College of Engineering & Technology, Kolhapur (2026)</span>
              </div>
              <div className={styles.linksBlock}>
                <h4>Links</h4>
                <ul className={styles.linkList}>
                  <li><a href="https://github.com/KarnJadhav" target="_blank" rel="noreferrer">GitHub</a></li>
                  <li><a href="https://www.linkedin.com/in/karn-jadhav-64a955262/" target="_blank" rel="noreferrer">LinkedIn</a></li>
                  <li><a href="mailto:karnsinhjadhav66@gmail.com">karnsinhjadhav66@gmail.com</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Our values</h2>
          <p>Focus on what the board is teaching you, not just what the engine says.</p>
        </div>
        <div className={styles.valuesGrid}>
          {values.map((value) => (
            <article key={value.title} className={styles.valueCard}>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.storySection}`}>
        <div className={styles.sectionHeader}>
          <h2>How we got here</h2>
          <p>A short timeline of the ideas that shaped the platform.</p>
        </div>
        <div className={styles.timeline}>
          {timeline.map((item) => (
            <div key={item.year} className={styles.timelineItem}>
              <div className={styles.timelineYear}>{item.year}</div>
              <div className={styles.timelineBody}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.statsSection}`}>
        <div className={styles.sectionHeader}>
          <h2>Momentum by the numbers</h2>
          <p>Measured to keep players moving forward, one review at a time.</p>
        </div>
        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.ctaSection}`}>
        <div className={styles.ctaCard}>
          <div>
            <h2>Ready to review with intention?</h2>
            <p>Upload a PGN, get a review, and start training with a plan.</p>
          </div>
          <button className={styles.primary}>Upload a game</button>
        </div>
      </section>
    </div>
  );
}
