# 🔍 מערכת המונטיזציה — דוח בדיקה شامل

**תאריך:** 2026-04-25  
**סטטוס:** ✅ **בנויה וגובעת** עם **2 בעיות קריטיות** ו-5 אזהרות

---

## 📊 סטטוס כללי

| קומפוננטה | סטטוס | הערות |
|----------|------|-------|
| **SQL Migration** | ✅ | `20260425_tutor_trial.sql` — כולל RPC functions |
| **Components** | ✅ | RoleSelection, SoftLock, OnboardingModal, SubscriptionPaywall |
| **Hooks** | ✅ | useTutorTrial, useSubscriptionStatus |
| **Edge Function** | ✅ | payment-webhook לקבל callbacks מ PayPal/Morning |
| **Build** | ✅ | Compiles successfully (0 errors) |
| **Integration** | ⚠️ | Missing in ParentDashboard, TeacherDashboard, GameApp |

---

## 🔴 בעיות קריטיות

### #1: **חסר SQL migration ל-subscription_tiers, subscription_payments, coupon_codes**

**הבעיה:**  
קיים רק `20260425_tutor_trial.sql` אך **חסרה** ה-migration הראשית שמגדירה:
- `subscription_tiers` table (חבילות תמחור)
- `subscription_payments` table (רישום התשלומים עם webhook_id)
- `coupon_codes` table (קודים פרומו)
- RPC functions כ `process_webhook_payment`, `get_user_subscription`

**השפעה:**  
❌ EdgeFunction `payment-webhook` יכשל כי קורא RPC שלא קיים  
❌ SubscriptionPaywall יציג חבילות אך לא יוכל לשמור תשלומים  
❌ Realtime listeners ינסו לקרוא מטבלאות שלא קיימות

**פתרון:**
צריך להוסיף SQL migration `20260428_subscriptions.sql` (מתוכנית) עם:
```sql
CREATE TABLE subscription_tiers (...)
CREATE TABLE subscription_payments (...)
CREATE OR REPLACE FUNCTION process_webhook_payment(...)
```

**עדיפות:** 🔴 **קריטית** — חייב לפני deployment

---

### #2: **חסרה אינטגרציה ב-3 דשבורדים ראשיים**

**הבעיה:**  
קומפוננטות קיימות אך **לא יותקנו** בדשבורדים בפועל:

**ParentDashboard.jsx:**
- ❌ לא מציג `OnboardingModal` on first visit
- ❌ לא מציג `SubscriptionPaywall` when expired
- ❌ אין Realtime listener לשינויים ב-subscription_status

**TeacherDashboard.jsx:**
- ❌ לא מציג `RoleSelection` כאשר teacher בפעם ראשונה
- ❌ לא משתמש ב-`useTutorTrial` hook
- ❌ לא מציג `TutorReadOnlyBanner` בניסיון

**GameApp.jsx:**
- ❌ לא מציג `SoftLock` כאשר subscription expired
- ❌ קוראים לפונקציה `get_child_subscription` בSQL אך component לא משתמש בתוצאה

**השפעה:**  
❌ משתמשים לא רואים משהו מהמערכת המונטיזציה בפועל  
❌ אין soft-lock כאשר ההורה לא שילם

**פתרון:**
צריך לערוך את 3 הדשבורדים כדי:
1. להוסיף conditional rendering
2. לחבר hooks ל-Realtime listeners
3. להציג לוגיקה transition/payment flow

**עדיפות:** 🔴 **קריטית** — תוצאה של #1

---

## 🟡 אזהרות (לא חסומות, אך צריך תיקון)

### #3: **Edge Function error handling חלש**

**הקובץ:** `/supabase/functions/payment-webhook/index.ts`

**הבעיה:**
```typescript
if (!data) {
  // Already processed — return 200 so provider doesn't retry
  console.log('[payment-webhook] Already processed:', webhook_id);
  return json({ status: 'already_processed' });
}
```

RPC `process_webhook_payment` **תמיד** מחזיר boolean אבל הקוד בודק `if (!data)`. זה עלול להיות כמו `false` הטובה.

**עדיפות:** 🟡 **גבוהה** — יכול לגרום לדוא"ל שגוי של "כבר עובד"

---

### #4: **constants.js — PLAN_URLS קשוח (hardcoded)**

**הקובץ:** `/src/components/dashboard/constants.js`

**הבעיה:**
```javascript
export const PLAN_URLS = {
  '1m':  'https://mrng.to/5MeNM9EHv5',    // קשוח
  '3m':  'https://mrng.to/JbLqveBkPU',    // קשוח
  'vip': 'https://wa.me/972535303607?...' // מספר טלפון בקוד!
};
```

זה חושף:
- Morning payment URLs ישירות בקוד (חזון ואבטחה)
- מספר טלפון אישי `0535303607`

**עדיפות:** 🟡 **בינונית** — צריך להעביר ל-.env

---

### #5: **useTutorTrial hook — subscription_status hardcoded**

**הקובץ:** `/src/hooks/useTutorTrial.js` (שורה 51)

**הבעיה:**
```javascript
if (s === 'active' || s === 'vip') {
  setIsInTrial(false);
  setTrialExpired(false);
```

RPC `get_tutor_trial_status` כבר בודק זאת! אתה משנה state ידנית במקום להפעיל re-fetch.

**בעיה קטנה:** אם יש חרגות RPC, hook לא יזהה זאת.

**עדיפות:** 🟡 **נמוכה** — תפקוד נכון אך יזום code

---

### #6: **SoftLock.jsx — בדיקה אבל אין UI integration**

**הקובץ:** `/src/components/dashboard/SoftLock.jsx`

**הבעיה:**  
הקומפוננטה יפה ✨ אך **אבד כיצד שהוא מוקצה ל-GameApp**:

**GameApp.jsx צריך כמו:**
```javascript
const childSubscription = await supabase.rpc('get_child_subscription', { p_token });
if (childSubscription.blocked) {
  return <SoftLock />;
}
```

תיקציה לדוגמה בSoftLock documentation אך לא בקוד עצמו.

**עדיפות:** 🟡 **בינונית** — שימוש תיעוד; יזום implementation

---

## ✅ מה עובד טוב

| קומפוננטה | מה טוב |
|----------|--------|
| **RoleSelection.jsx** | עיצוב יפה, אנימציות חלקות, הודעות ברורות |
| **SoftLock.jsx** | עיצוב חד לילדים, אנימציית spaceship ניהוליות |
| **OnboardingModal.jsx** | הסבר 14-יום ברור, localStorage מנהל חיום בטוח |
| **SubscriptionPaywall.jsx** | תצוגה יפה של חבילות, Realtime auto-return when paid |
| **payment-webhook** | Edge Function מובנית בשימוש דרך, CORS נכון, logging טוב |
| **useTutorTrial** | Real-time listener מובנה, auto re-fetch on profile change |
| **SQL Trigger** | `set_tutor_trial_on_new_teacher` auto-sets start date |

---

## 🚀 צעדים הבאים (סדר עדיפויות)

### **P0 — MUST DO (חסום)**

1. **[30 דק]** צור `20260428_subscriptions.sql` עם:
   - `subscription_tiers` table + default tiers
   - `subscription_payments` table
   - RPC `process_webhook_payment()`
   - RPC `get_user_subscription()`
   - RPC `check_and_update_subscription_status()`
   
2. **[45 דק]** integrate into ParentDashboard.jsx:
   ```javascript
   <Suspense>
     {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
   </Suspense>
   {isExpired && !isActive && <SubscriptionPaywall userId={userId} isActive={isActive} ... />}
   ```

3. **[30 דק]** integrate into TeacherDashboard.jsx:
   ```javascript
   const { isReadOnly, hoursRemaining } = useTutorTrial(teacherId);
   {isReadOnly && <TutorReadOnlyBanner hoursRemaining={hoursRemaining} />}
   ```

4. **[20 דק]** integrate into GameApp.jsx:
   ```javascript
   const { blocked } = await supabase.rpc('get_child_subscription', { p_token: magicToken });
   if (blocked) return <SoftLock />;
   ```

### **P1 — HIGH (יזום)**

5. Move `PLAN_URLS` from constants.js to `.env.local`
6. Fix Edge Function `if (!data)` check to verify `data === true`
7. Add Realtime listener in useSubscriptionStatus hook

### **P2 — MEDIUM (נחמד)**

8. Code-split GameApp (522 kB → too large)
9. Add unit tests for each RPC function
10. Add error boundaries around payment components

---

## 📝 Deployment Checklist

- [ ] **SQL:** `supabase db push` (20260425_tutor_trial.sql + 20260428_subscriptions.sql)
- [ ] **Env:** Add to `.env.local`:
  ```
  VITE_PAYPAL_WEBHOOK_SECRET=...
  VITE_MORNING_WEBHOOK_SECRET=...
  ```
- [ ] **Edge Function:** `supabase functions deploy payment-webhook`
- [ ] **Integration:** Merge ParentDashboard, TeacherDashboard, GameApp edits
- [ ] **Test Desktop:** http://localhost:5173
  1. Parent signup → OnboardingModal ✓
  2. Day 14+ → SubscriptionPaywall ✓
  3. Pay → SoftLock disappears ✓
  4. Teacher signup → RoleSelection ✓
  5. Day 2+ of tutor trial → TutorReadOnlyBanner ✓
- [ ] **Test Mobile:** https://vercel-url/
  1. Same flow on real device (HTTPS required for Web Push)

---

## 📞 סיכום

**תוצאה:** ✅ **80% בנויה, 20% חסרה integration**

| סטטוס | Count |
|------|-------|
| ✅ קומפוננטות שלמות | 4/4 |
| ✅ SQL (partial) | 1/2 |
| ✅ Hooks | 2/2 |
| ✅ Edge Functions | 1/1 |
| ❌ Integrations | 0/3 |
| 🟡 Bugs/Warnings | 5 |

**זמן קביעה משוער:** 2-3 שעות (SQL + integrations)

**המלצה:** הכל בעצם כתוב, רק צריך:
1. לרוץ SQL migration נוסף
2. להוסיף 3 conditional renders בדשבורדים
3. לחבר hooks ל-components

**תקו ממשיך מחרתיים!** 🚀
