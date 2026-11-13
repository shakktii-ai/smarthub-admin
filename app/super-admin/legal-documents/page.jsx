import LegalDocumentStudio from '@/components/superadmin/LegalDocumentStudio';
import { listDocuments } from './actions';

export default async function LegalDocumentsPage() {
  const data = await listDocuments();
  return <LegalDocumentStudio data={data} />;
}
