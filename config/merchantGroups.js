// The merchant-group screen's vocabulary. Kept out of the component because the
// same words are needed in the table, the form hints, the drawer and the
// explainer, and three copies would drift.

export const GROUP_CODE_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;

// A group is one name for a chain. Its members are merchants that carry the
// group code; the owner is a merchant that represents the chain commercially.
// Nothing in this file may imply that the settlement cycle schedules payouts:
// the settlement engine still settles each merchant's own batches.
export const GROUP_EXPLAINER =
  'A merchant group gives a chain or network one name, so its outlets can be found, ' +
  'reported and messaged together. Membership is the list of merchants in it; the owner ' +
  'is the lead account, not a member by default.';

export const GROUP_BASICS = [
  {
    title: 'One name for the chain',
    body:
      'A group is a label on merchants, not a new kind of merchant. Adding a member changes ' +
      'that merchant’s group code; removing it clears the code. The merchant keeps its own ' +
      'KYC, pricing and settlement account.',
  },
  {
    title: 'Used today: group campaigns',
    body:
      'The campaign composer’s audience “One merchant group” targets every active member of ' +
      'this group. That is the one live consumer of membership today, which is why the member ' +
      'list has to be right.',
  },
  {
    title: 'Settlement cycle is a record, not a scheduler',
    body:
      'The cycle records what was agreed for the chain — T0, T1, T2, weekly or monthly. ' +
      'Settlement runs currently settle each merchant’s own batches, so changing the cycle ' +
      'here does not reschedule a payout by itself.',
  },
  {
    title: 'Owner is not a member by default',
    body:
      'The owner is the merchant account that represents the group for the team. It can also ' +
      'be a member, but choosing an owner does not add it to the member list — add it ' +
      'explicitly if the lead account should receive group campaigns too.',
  },
];

export const SETTLEMENT_CYCLES = {
  T0: {
    label: 'T0 — same day',
    short: 'Same day',
    description:
      'The agreed cycle is same-day settlement: the payout is due on the day the payment is captured.',
  },
  T1: {
    label: 'T1 — next working day',
    short: 'Next working day',
    description:
      'The agreed cycle is next-working-day settlement: the payout is due on the next business day.',
  },
  T2: {
    label: 'T2 — two working days',
    short: 'Two working days',
    description:
      'The agreed cycle is two-working-day settlement: the payout is due on the second business day.',
  },
  weekly: {
    label: 'Weekly',
    short: 'Weekly',
    description:
      'The agreed cycle is weekly settlement: the chain is paid once a week, on its payout day.',
  },
  monthly: {
    label: 'Monthly',
    short: 'Monthly',
    description:
      'The agreed cycle is monthly settlement: the chain is paid once a month.',
  },
};

export const SETTLEMENT_CYCLE_OPTIONS = Object.entries(SETTLEMENT_CYCLES).map(
  ([value, cycle]) => [cycle.label, value],
);

export const cycleOf = (value) =>
  SETTLEMENT_CYCLES[value] || {
    label: value || 'Not set',
    short: value || 'Not set',
    description: 'This cycle is not one of the five the form offers; correct it with Edit.',
  };

export const GROUP_STATUSES = { active: 'Active', inactive: 'Inactive' };

export const GROUP_STATUS_OPTIONS = [
  ['Active', 'active'],
  ['Inactive', 'inactive'],
];

export const GROUP_LIMITS = {
  name: 255,
  code: 40,
  membersPerPage: 20,
};
