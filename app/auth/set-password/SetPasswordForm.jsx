'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { Field, inputCls } from '@/components/ui';
import { setPassword } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="w-full rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50">{pending ? 'Saving…' : 'Set password'}</button>;
}

export default function SetPasswordForm() {
  const [state, action] = useFormState(setPassword, {});
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <form action={action} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold">Set your password</h1>
        <p className="mb-4 text-sm text-slate-500">At least 10 characters, with upper case, lower case and a number.</p>
        {state?.error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{state.error}</p>}
        <Field label="New password"><input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
        <Field label="Confirm password"><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
        <Submit />
      </form>
    </div>
  );
}
