import SecuritySettings from '@/components/account/SecuritySettings';
import { getMfaSummary } from './actions';

export default async function SecurityPage() {
  const data = await getMfaSummary();
  return <SecuritySettings data={data} />;
}
