// import './globals.css';
// import 'react-toastify/dist/ReactToastify.css';
// import { AppProvider } from '@/components/ui/AppContext';

// export const metadata = { title: 'SMARTHUB PAY - Merchant Admin', description: 'Merchant Admin Dashboard ' };

// export default function RootLayout({ children }) {
//   return (<html lang="en"><body><AppProvider>{children}</AppProvider></body></html>);
// }

import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { AppProvider } from "@/components/ui/AppContext";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata = {
  title: "SmartHub Pay — Payments, Collections & Growth",
  description:
    "SmartHub Pay helps Indian merchants accept UPI, card and QR payments with POS devices, merchant onboarding and collection solutions.",
  openGraph: {
    title: "SmartHub Pay — Payments, Collections & Growth",
    description:
      "POS, QR, lending, merchant onboarding, UPI and collections for Indian businesses.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.className}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
