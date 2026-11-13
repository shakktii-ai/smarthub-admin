// Every "Opens on tap" value the merchant app can actually navigate to, mirrored from
// smarthubpay_merchant/lib/app/router.dart (RoutePaths). The app treats a deep link that starts
// with "/" as context.push(path), so a typo here opens a blank route instead of a screen.
//
// Deliberately excluded: the onboarding and loan-application steps plus /checkout, /otp,
// /loan/summary and /loan/result. Those read a live object from GoRouter's `extra`
// (MerchantApplication, EligibilityResult, BackendCheckout) and only make sense as the next step
// of a flow the app itself started - a banner could never reach them.
export const MERCHANT_APP_SCREENS = [
  ["Dashboard - Home", "/dashboard/home"],
  ["Dashboard - Payments", "/dashboard/payments"],
  ["Dashboard - QR / Collect", "/dashboard/qr"],
  ["Dashboard - Reports", "/dashboard/reports"],
  ["Dashboard - Transactions", "/dashboard/history"],
  ["Settlements", "/settlements"],
  ["Payment Links", "/payment-links"],
  ["Store Profile", "/store-profile"],
  ["Notifications", "/notifications"],
  ["Support", "/support"],
  ["Security", "/security"],
  ["Terms", "/terms"],
  ["Onboarding - Registration", "/register"],
  ["Onboarding - Application Status", "/application-status"],
  ["Loan - Landing", "/loan"],
  ["Loan - My Loans", "/loan/my-loans"],
  ["Loan - Tracking", "/loan/tracking"],
  ["Loan - Dashboard", "/loan/dashboard"],
];

// Sentinel for the "link to a website instead" choice; the form reveals a URL field for it.
export const EXTERNAL_DEEP_LINK = "__external__";

export const DEEP_LINK_OPTIONS = [
  ...MERCHANT_APP_SCREENS,
  ["External web page (https://...)", EXTERNAL_DEEP_LINK],
];

const SCREEN_BY_PATH = new Map(MERCHANT_APP_SCREENS.map(([label, path]) => [path, label]));

// Turns a stored deep_link back into the words the picker used, so a list row reads "Dashboard -
// QR / Collect" instead of a bare path. Anything not on the list is shown as stored - a legacy
// hand-typed path or a web link - because that is exactly what the admin needs to see.
export const deepLinkLabel = (value) => {
  if (!value) return "";
  const text = String(value);
  return SCREEN_BY_PATH.get(text) || (text.startsWith("/") ? text : `Web: ${text}`);
};
