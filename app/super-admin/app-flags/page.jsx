import AppFeatureFlags from '@/components/superadmin/AppFeatureFlags';
import { listAppFlags } from './actions';

export default async function AppFlagsPage() {
  const data = await listAppFlags();
  return <AppFeatureFlags data={data} />;
}
