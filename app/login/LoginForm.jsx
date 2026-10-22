
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  LockKeyhole,
  ArrowRight,
  CreditCard,
  Landmark,
  Smartphone,
  Users,
} from 'lucide-react';

import { Field, inputCls } from '@/components/ui';
import { requestPasswordReset, signIn } from './actions';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#102c55] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/15 transition-all duration-200 hover:bg-[#17417a] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Signing in...' : 'Sign in'}
      {!pending && (
        <ArrowRight
          size={18}
          className="transition-transform group-hover:translate-x-1"
        />
      )}
    </button>
  );
}

function NetworkVisual() {
  const nodes = [
    { icon: CreditCard, position: 'left-[12%] top-[30%]' },
    { icon: Landmark, position: 'left-[42%] top-[49%]' },
    { icon: Smartphone, position: 'left-[66%] top-[28%]' },
    { icon: Users, position: 'right-[8%] top-[58%]' },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] overflow-hidden"
    >
      <div className="absolute -bottom-40 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-[50%] border border-blue-400/30 bg-gradient-to-t from-blue-500/15 via-blue-500/5 to-transparent" />

      <div className="absolute -bottom-52 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-[50%] border border-blue-400/20" />

      <svg
        className="absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 800 360"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 220 Q180 70 370 215 T800 185"
          stroke="#42B8FF"
          strokeWidth="1.5"
        />
        <path
          d="M0 270 Q190 120 420 255 T800 230"
          stroke="#FFAC36"
          strokeWidth="1.2"
        />
        <path
          d="M80 360 Q300 80 580 360"
          stroke="#42B8FF"
          strokeWidth="1"
          strokeDasharray="5 7"
        />
      </svg>

      {nodes.map(({ icon: Icon, position }, index) => (
        <div
          key={index}
          className={`absolute ${position} flex h-14 w-14 items-center justify-center rounded-full border border-blue-300/60 bg-blue-400/10 text-blue-100 shadow-lg shadow-blue-500/10 backdrop-blur-sm sm:h-[68px] sm:w-[68px]`}
        >
          <Icon size={27} strokeWidth={1.7} />
        </div>
      ))}

      <div className="absolute left-[28%] top-[34%] h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_18px_4px_rgba(255,172,54,0.5)]" />
      <div className="absolute left-[58%] top-[60%] h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_16px_4px_rgba(66,184,255,0.5)]" />
      <div className="absolute right-[26%] top-[22%] h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_16px_4px_rgba(255,172,54,0.5)]" />
    </div>
  );
}

export default function LoginForm({ notice }) {
  const [state, action] = useFormState(signIn, {});
  const [email, setEmail] = useState('');
  const [show, setShow] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const error = state?.error || notice;

  const forgot = async () => {
    if (!email.trim()) {
      setNote('Enter your official work email first.');
      return;
    }

    setBusy(true);
    setNote('');

    try {
      const result = await requestPasswordReset(email);
      setNote(result?.message || 'Please check your email for next steps.');
    } catch {
      setNote('Could not request a password reset. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eff4fb] ">
      {/* Left branding panel */}
      {/* <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#0c2342] px-12 py-10 text-white lg:flex xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(30,100,190,0.35),transparent_55%)]" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-white shadow-lg shadow-black/20">
            <Image
              src="/smarthubpay.jpeg"
              alt="SmartHub Pay"
              fill
              priority
              sizes="68px"
              className="object-cover object-[center_38%]"
            />
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight">
              SMARTHUB PAY
            </p>
            <p className="mt-0.5 text-sm text-blue-200">
              Secure Operations Portal
            </p>
          </div>
        </div>

        <div className="relative z-10 -mt-16 max-w-2xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
            One platform. Complete visibility.
          </p>

          <h1 className="text-2xl font-extrabold leading-[1.16] tracking-tight xl:text-6xl">
            One platform.
            <br />
            Every payment.
            <br />
            <span className="text-[#ffab30]">Complete control.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-blue-100/80 xl:text-lg">
            Secure access to your SmartHub Pay operations, teams and
            payment workflows — all in one place.
          </p>
        </div>

        <NetworkVisual />

        <div className="relative z-10 flex items-center gap-2 text-xs text-blue-100/70">
          <ShieldCheck size={17} className="shrink-0 text-blue-300" />
          <p>Authorised personnel only. Access is monitored and logged.</p>
        </div>
      </section> */}

      {/* Login area */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-sky-100/60 blur-3xl" />

        <div className="relative z-10 w-full max-w-[470px]">
          {/* Mobile branding */}
          <div className="mb-4 flex items-center gap-3 justify-center ">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
              <Image
                src="/smarthubpay.jpeg"
                alt="SmartHub Pay"
                fill
                priority
                sizes="56px"
                className="object-cover object-[center_38%]"
              />
            </div>

            <div>
              <p className="font-extrabold tracking-tight text-[#102c55]">
                SMARTHUB PAY
              </p>
              <p className="text-sm text-slate-600">Secure Operations Portal</p>
            </div>
          </div>

          <form
            action={action}
            noValidate
            className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_24px_80px_-25px_rgba(15,39,73,0.22)] backdrop-blur sm:p-9"
          >
            <div className="mb-4">
              {/* <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                SmartHub Pay · Secure Portal
              </p> */}

              <h2 className="text-md font-extrabold tracking-tight text-[#102c55] sm:text-[34px]">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                Sign in with your official work email to continue to
                your assigned dashboard.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <div className="space-y-5">
              <Field label="Official Work Email">
                <span className="relative block">
                  <Mail
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="name@company.com"
                    className={`${inputCls} h-[52px] rounded-xl border-slate-200 bg-white pl-11 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100`}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </span>
              </Field>

              <Field label="Password">
                <span className="relative block">
                  <LockKeyhole
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    name="password"
                    type={show ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`${inputCls} h-[52px] rounded-xl border-slate-200 bg-white pl-11 pr-12 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100`}
                  />

                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    aria-pressed={show}
                    onClick={() => setShow((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-[#102c55] focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {show ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
              </Field>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={forgot}
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-800 hover:underline disabled:opacity-50"
              >
                {busy ? 'Please wait...' : 'Forgot password?'}
              </button>
            </div>

            {note && (
              <p
                role="status"
                className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"
              >
                {note}
              </p>
            )}

            <div className="mt-6">
              <Submit />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <ShieldCheck size={20} className="shrink-0 text-blue-600" />
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Protected access · Secure authentication
            </p>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            © {new Date().getFullYear()} SmartHub Pay. Authorised access only.
          </p>
        </div>
      </section>
    </main>
  );
}
