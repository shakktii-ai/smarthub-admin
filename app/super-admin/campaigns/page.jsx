import CampaignStudio from '@/components/superadmin/CampaignStudio';
import { listCampaigns } from './actions';

export default async function CampaignsPage() {
  const data = await listCampaigns();
  return <CampaignStudio data={data} />;
}
