
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBranch } from './actions';

const initialForm = {
  name: '',
  code: '',
  city: '',
  address: '',
};

export default function BranchesClient({ branches }) {
  const [form, setForm] = useState(initialForm);
  const [territoryName, setTerritoryName] = useState('');
  const [territoryState, setTerritoryState] = useState('Maharashtra');
  const [territories, setTerritories] = useState([]);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === 'code' ? value.toUpperCase() : value,
    }));
  }

  function addTerritory() {
    const name = territoryName.trim();
    const state = territoryState.trim();

    if (name.length < 2 || name.length > 100) {
      setMessage('Territory name must be 2–100 characters.');
      setSuccess(false);
      return;
    }

    if (state.length > 100) {
      setMessage('State must not exceed 100 characters.');
      setSuccess(false);
      return;
    }

    if (
      territories.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setMessage('This territory is already in the form.');
      setSuccess(false);
      return;
    }

    if (territories.length >= 100) {
      setMessage('Maximum 100 territories per branch.');
      setSuccess(false);
      return;
    }

    setTerritories((previous) => [
      ...previous,
      { name, state },
    ]);

    setTerritoryName('');
    setMessage('');
  }

  function removeTerritory(indexToRemove) {
    setTerritories((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (territoryName.trim()) {
      setMessage('Click Add Territory before creating the branch.');
      setSuccess(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set('territories', JSON.stringify(territories));

    startTransition(async () => {
      const result = await createBranch(formData);

      setMessage(result.message);
      setSuccess(result.success);

      if (result.success) {
        setForm(initialForm);
        setTerritories([]);
        setTerritoryName('');
        setTerritoryState('Maharashtra');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Branch Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Create branches and their territories together.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Add New Branch
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Branch Name *
              </label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Pune"
                required
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-700">
                Branch Code *
              </label>
              <input
                id="code"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. PUN"
                required
                maxLength={12}
                pattern="[A-Za-z0-9-]{2,12}"
                title="Use 2–12 letters, numbers or hyphens."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              />
            </div>

            <div>
              <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
                City *
              </label>
              <input
                id="city"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Pune"
                required
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
                Address (Optional)
              </label>
              <input
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Branch address"
                maxLength={500}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-base font-semibold text-gray-900">
              Branch Territories
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add the areas covered by this branch.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label htmlFor="territoryName" className="mb-1 block text-sm font-medium text-gray-700">
                  Territory Name
                </label>
                <input
                  id="territoryName"
                  value={territoryName}
                  onChange={(event) => setTerritoryName(event.target.value)}
                  placeholder="e.g. Hadapsar"
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="territoryState" className="mb-1 block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  id="territoryState"
                  value={territoryState}
                  onChange={(event) => setTerritoryState(event.target.value)}
                  placeholder="Maharashtra"
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addTerritory}
                  className="w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 sm:w-auto"
                >
                  + Add Territory
                </button>
              </div>
            </div>

            {territories.length > 0 && (
              <div className="mt-4 space-y-2">
                {territories.map((territory, index) => (
                  <div
                    key={`${territory.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {territory.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {territory.state || 'State not specified'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTerritory(index)}
                      aria-label={`Remove ${territory.name}`}
                      className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              {territories.length} territories added
            </p>
          </div>

          {message && (
            <p
              role="status"
              className={`text-sm ${
                success ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Creating...' : 'Create Branch'}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Branches
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Total branches: {branches.length}
          </p>
        </div>

        {branches.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No branches created yet.
          </p>
        ) : (
          
<div className="overflow-x-auto">
  <table className="w-full text-left text-sm">
    <thead className="bg-gray-50 text-gray-600">
      <tr>
        <th className="px-5 py-3 font-medium">Branch</th>
        <th className="px-5 py-3 font-medium">Code</th>
        <th className="px-5 py-3 font-medium">City</th>
        <th className="px-5 py-3 font-medium">Territories</th>
        <th className="px-5 py-3 font-medium">Address</th>
        <th className="px-5 py-3 font-medium">Status</th>
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-100">
      {branches.map((branch) => (
        <tr key={branch.id} className="align-top hover:bg-gray-50">
          <td className="px-5 py-4 font-medium text-gray-900">
            {branch.name}
          </td>

          <td className="px-5 py-4 text-gray-600">
            {branch.code}
          </td>

          <td className="px-5 py-4 text-gray-600">
            {branch.city}
          </td>

          <td className="px-5 py-4">
            {branch.territories?.length > 0 ? (
              <div className="flex max-w-xs flex-wrap gap-2">
                {branch.territories.map((territory) => (
                  <span
                    key={territory.id}
                    className="inline-flex flex-col rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5"
                  >
                    <span className="font-medium text-blue-800">
                      {territory.name}
                    </span>
                    {territory.state && (
                      <span className="text-xs text-blue-600">
                        {territory.state}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400">
                No territories
              </span>
            )}
          </td>

          <td className="px-5 py-4 text-gray-600">
            {branch.address || '—'}
          </td>

          <td className="px-5 py-4">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                branch.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {branch.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

        )}
      </section>
    </div>
  );
}
