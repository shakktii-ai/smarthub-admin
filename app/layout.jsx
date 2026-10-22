import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { AppProvider } from '@/components/ui/AppContext';

export const metadata = { title: 'SMARTHUB PAY - Merchant Admin', description: 'Merchant Admin Dashboard ' };

export default function RootLayout({ children }) {
  return (<html lang="en"><body><AppProvider>{children}</AppProvider></body></html>);
}
