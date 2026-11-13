import SetPasswordForm from './SetPasswordForm';

// The reset token arrives via /auth/confirm and is consumed by POST /api/identity/v1/password/reset.
// There is no session at this point, so the user signs in after setting a new password.
export default async function SetPasswordPage({ searchParams }) {
  const token = String(searchParams?.token || searchParams?.token_hash || '');
  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
          <h1 className="text-xl font-bold">This link is not valid</h1>
          <p className="mb-4 text-sm text-slate-500">
            It is missing its reset token. Request a new password reset email.
          </p>
          <a href="/login" className="text-sm font-semibold text-blue-600 hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }
  return <SetPasswordForm token={token} />;
}
