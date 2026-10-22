import LoginForm from './LoginForm';

const MESSAGES = { denied: 'Your account is inactive or has no assigned role. Contact a Super Admin.', link: 'This link is invalid or has expired. Request a new one.' };

export default function LoginPage({ searchParams }) {
  return <LoginForm notice={MESSAGES[searchParams?.error] || ''} />;
}
