// The ONLY import point for the UI. `useMocks` is a build-time constant that is false in production,
// so the mock module is not loaded there; Supabase services are used instead.
import { API_CONFIG } from '@/config/api';

const impl = () => (API_CONFIG.useMocks ? import('./mock') : import('./supabase'));
export const listRecords = async (...a) => (await impl()).listRecords(...a);
export const getFilterOptions = async (...a) => (await impl()).getFilterOptions(...a);
export const createRecord = async (...a) => (await impl()).createRecord(...a);
export const performAction = async (...a) => (await impl()).performAction(...a);
export const getDashboard = async (...a) => (await impl()).getDashboard(...a);
export const getRecentFeeds = async (...a) => (await impl()).getRecentFeeds(...a);
export const getOnboardingOverview = async (...a) => (await impl()).getOnboardingOverview(...a);
export const getApplication = async (...a) => (await impl()).getApplication(...a);
export const addApplication = async (...a) => (await impl()).addApplication(...a);
export const verifyDocument = async (...a) => (await impl()).verifyDocument(...a);
export const runPennyDrop = async (...a) => (await impl()).runPennyDrop(...a);
export const approveApplication = async (...a) => (await impl()).approveApplication(...a);
export const rejectApplication = async (...a) => (await impl()).rejectApplication(...a);
export const getCollectionDashboard = async (...a) => (await impl()).getCollectionDashboard(...a);
export const collectEmi = async (...a) => (await impl()).collectEmi(...a);
export const getMerchant = async (...a) => (await impl()).getMerchant(...a);
export const updateMerchant = async (...a) => (await impl()).updateMerchant(...a);
export const getSuperAdminDashboard = async (...a) => (await impl()).getSuperAdminDashboard(...a);
