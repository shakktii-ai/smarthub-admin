import MandateAgents from '@/components/superadmin/MandateAgents';
import { listMandateAgentStats } from './actions';

export default async function MandateAgentsPage() {
  const res = await listMandateAgentStats();
  if (res.error) {
    return <p className="p-6 text-sm text-red-600">{res.error}</p>;
  }
  return (
    <div className="space-y-3 p-6">
      <h1 className="text-xl font-extrabold text-slate-900">
        Mandate Agents
      </h1>
      <p className="text-sm text-slate-600">
        Each agent who signed in to collect and created mandates appears here,
        one row per agent, with totals at the top. Filter by name, code, phone,
        team or region.
      </p>
      <MandateAgents data={res.data} />
    </div>
  );
}
