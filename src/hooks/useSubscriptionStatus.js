// Single source of truth for "does this user have an active paid seat?".
// Call with a profile-like object: { subscription_status, subscription_expires_at, role }.
// Returns { isActive, isTrial, isExpired, isVIP, daysLeft, label, showUpgradeNudge }.
//
// Keep this in sync with server-side checks and useGameStore subscription logic.

export default function useSubscriptionStatus(profile) {
  if (!profile) {
    return {
      isActive: false, isTrial: false, isExpired: false, isVIP: false,
      daysLeft: 0, label: '—', showUpgradeNudge: false,
    };
  }

  const status = profile.subscription_status;
  const expires = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
  const now = new Date();
  const daysLeft = expires ? Math.max(0, Math.ceil((expires - now) / 86400000)) : 0;

  const isVIP     = status === 'vip';
  const isActive  = status === 'active' || isVIP;
  const isTrial   = status === 'trial';
  const isExpired = status === 'expired' || (expires && expires < now && !isVIP);

  let label = '—';
  if (isVIP)          label = '🌟 VIP';
  else if (isActive)  label = expires ? `מנוי פעיל — עד ${expires.toLocaleDateString('he-IL')}` : 'מנוי פעיל';
  else if (isTrial)   label = `ניסיון — ${daysLeft} ימים נותרו`;
  else if (isExpired) label = 'המנוי פג';

  // Show the upgrade CTA only to users who aren't already paying.
  const showUpgradeNudge = !isActive;

  return { isActive, isTrial, isExpired, isVIP, daysLeft, label, showUpgradeNudge };
}
