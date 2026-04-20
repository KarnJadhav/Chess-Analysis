// import 'bootstrap/dist/css/bootstrap.min.css';
// import { SessionProvider } from 'next-auth/react';
// import type { AppProps } from 'next/app';
// import '../globals.css';
// import Navbar from '@/components/Navbar';

// export default function App({ Component, pageProps }: AppProps) {
//   return (
//     <SessionProvider session={pageProps.session}>
//       <Navbar />
//       <Component {...pageProps} />
//     </SessionProvider>
//   );
// }
// pages/_app.tsx

import 'bootstrap/dist/css/bootstrap.min.css';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import '../globals.css'; // Your global styles (with Tailwind directives)
import Navbar from '@/components/Navbar'; // Your new Tailwind/CSS Module Navbar

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Navbar />
      <Component {...pageProps} />
    </SessionProvider>
  );
}