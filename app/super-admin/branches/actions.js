
'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';

export async function createBranch(formData) {
  try {
    const auth = await authorize(['super_admin']);

    if (auth.error) {
      return { success: false, message: auth.error };
    }

    const name = String(formData.get('name') || '').trim();
    const code = String(formData.get('code') || '')
      .trim()
      .toUpperCase();
    const city = String(formData.get('city') || '').trim();
    const address = String(formData.get('address') || '').trim();

    let territories;

    try {
      territories = JSON.parse(
        String(formData.get('territories') || '[]')
      );
    } catch {
      return {
        success: false,
        message: 'Invalid territories data.',
      };
    }

    if (!name || !code || !city) {
      return {
        success: false,
        message: 'Branch Name, Code and City are required.',
      };
    }

    if (
      name.length > 100 ||
      city.length > 100 ||
      address.length > 500
    ) {
      return {
        success: false,
        message: 'Please check the maximum field lengths.',
      };
    }

    if (!/^[A-Z0-9-]{2,12}$/.test(code)) {
      return {
        success: false,
        message: 'Branch Code must be 2–12 letters, numbers or hyphens.',
      };
    }

    if (!Array.isArray(territories) || territories.length > 100) {
      return {
        success: false,
        message: 'Please provide a valid list of up to 100 territories.',
      };
    }

    const cleanedTerritories = [];
    const seen = new Set();

    for (const item of territories) {
      const territoryName = String(item?.name || '').trim();
      const state = String(item?.state || '').trim();

      if (
        territoryName.length < 2 ||
        territoryName.length > 100 ||
        state.length > 100
      ) {
        return {
          success: false,
          message: 'Check territory names and state values.',
        };
      }

      const key = territoryName.toLowerCase();

      if (seen.has(key)) {
        return {
          success: false,
          message: `Duplicate territory in this form: ${territoryName}`,
        };
      }

      seen.add(key);
      cleanedTerritories.push({
        name: territoryName,
        state: state || null,
      });
    }

    let created;
    try {
      created = await auth.api.post('/api/branches/v1', {
        branch_code: code,
        name,
        branch_type: 'branch',
        city,
        address: address || undefined,
      });
    } catch (error) {
      console.error('Create branch failed:', error.status, error.message);

      if (error.status === 409) {
        return { success: false, message: 'That branch code already exists.' };
      }

      return { success: false, message: error.message || 'Unable to create the branch.' };
    }

    revalidatePath('/super-admin/branches');

    return {
      success: true,
      // The backend has no territory API, so the list is validated but deliberately not persisted.
      message: cleanedTerritories.length
        ? `Branch created. ${cleanedTerritories.length} territories were not saved: the backend has no territory API.`
        : 'Branch created successfully.',
      branch: created,
    };
  } catch (error) {
    console.error('Create branch action failed:', error);

    return {
      success: false,
      message: 'Unexpected error. Please try again.',
    };
  }
}
