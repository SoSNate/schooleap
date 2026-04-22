# טיפים לעיצוב משחקים עתידיים — תובנות חוצות-מערכת

מסמך פנימי. עודכן לאחר QA_Report_2026-03-23 וסבב האפיון של אפריל 2026.
הכלל המנחה: **כל החלטה נתמכת בפדגוגיה, לא רק ב-UX.**

---

## 1. Lives — לא אוטומטי

- **אין lives** במשחק שבו ניסוי-וטעייה = למידה (MagicPatterns, Equations, PercentsLab, DecimalAreaLab).
- **יש lives** במשחק שבו דיוק = מטרה או שיש סיכון לרמאות ויזואלית (Tank, Decimal, Balance).
- שאלה לעצמך לפני שאתה מוסיף lives: **"האם טעות כאן מלמדת?"** אם כן — החלף ב-half-hint.

## 2. Half-Hint — ענישה עדינה ללא חיים

- לחיצה ראשונה: רמז קל (כיוון, דוגמה).
- לחיצה שניה: חצי-תשובה (ספרה ראשונה / טווח צר), **בלי כוכבים בסיבוב הזה**.
- יישום: `useHint({ halfHintEnabled: true })` מחזיר `penalized` — ה-component מתעלם מכוכבים אם true.

## 3. Level-Up: 3 ברצף OR 4 מתוך 5

- ילדים נתקעים ברמה על טעות אחת. 4/5 מאפשר "נפילה קלה" ועדיין התקדמות.
- 3-ברצף נשמר כמסלול מהיר למצטיינים.
- מיושם ב-`useGameStore.handleWin` דרך `recentResults` (חלון 5).

## 4. Anti-Cheat ויזואלי

- נוזל/מחוון **שקוף** = הילד מודד בעין, לא מחשב. תמיד:
  - opacity ≥ 0.85
  - רעש/גרדיאנט קל
  - קווי עזר דלילים ומקוטעים (לא רשת מדויקת)
- slider: step מותאם לטווח (`>100→10, >20→5, else 1`), אבל **לא פחות מ-step שימנע ניחוש בעין**.

## 5. מסכים קטנים (iPhone SE, 375×640)

- כל קונטרול עם height ≥ 7rem — עטוף ב-`max-h` או `@media (max-height:640px) { transform: scale(0.85); }`.
- אין grid 4+ עמודות ב-<400px — בצע `flex-wrap` + `max-h-XX overflow-y-auto`.
- `weight-var` וכל תווית-ערך: `minWidth` + `paddingInline` + `width:'auto'` — **לעולם לא `width` קשיח**.

## 6. שאלה לא מתחילה עם התשובה

- אם השאלה "מצא את X" ול-X יש ערך התחלתי ב-UI — **ודא ש-startValue ≠ answer**.
- תבנית: `start = rand() === answer ? rand()+step : rand()`.
- חל גם על: סליידרים, knobs, input מספרי, שברים נגררים.

## 7. אין שאלה זהה פעמיים ברצף

- הוסף `lastQuestionRef = useRef(null)`.
- ב-generateQuestion: `while (JSON.stringify(next) === JSON.stringify(last)) regenerate()`.
- חשוב במיוחד כשה-pool קטן (L1-L2).

## 8. Hints — טקסט לא "מגלה תשובה"

- L1-L2: רמז קונספטואלי ("חפש את הדפוס").
- L3: הכוונה ("חצי מהתשובה בין 10-20").
- L4: טכניקה ("הפוך וכפול").
- L5: רק דרך half-hint בלחיצה שניה.
- **אסור:** hint שמציג את התשובה ישירות ב-L1-L4.

## 9. Hint הומוגני

- קיים: `HintButton`, `HintBubble`, `useHint` (`src/components/shared/`, `src/hooks/useHint.js`).
- **אסור** `Swal.fire({ title: 'רמז' })` inline במשחק חדש — זה יוצר שוני חזותי.
- hints סטטיים עוברים ל-`src/utils/hints.js` (getHint(gameId, level, puzzle)).

## 10. Header — דרגה, לא שם משחק

- הילד יודע איפה הוא (סגר הדלת). מה שחשוב: **באיזו דרגה**.
- מיפוי: L1-2 טירון, L3 מתקדם, L4 אלוף, L5 רמטכ״ל.

## 11. Assignment Lock — sub-level

- אם הורה/מורה הקצה L3, הילד יכול לשחק L1/L2/L3 — לא רק L3.
- אבל **לא יעלה ל-L4** עד שיוריד את ה-assignment.

## 12. פלטת Pool — מוקדי קושי

- **L3 = חופש קוגניטיבי**: pool גדול עם distractors (הילד בורר).
- **L4 = דיוק**: pool קטן, exact matches בלבד (אין היכולת לנחש).
- **L5 = אתגר מבני**: פריט אחד מורכב/ארוך (לא N פריטים פשוטים).

## 13. פדגוגיה של שברים

- L1: unit fractions בלבד (1/n).
- L2: שקילות (3/6, 5/10, 50/100) — ללמד מבנה.
- L3: non-unit (2/3, 3/5).
- L4: כפל **או** חילוק טהור (לא מעורב).
- L5: שברים מרובעים (1/8, 3/8) + פעולות.

## 14. RTL / Hebrew

- סדר קריאה ימין-לשמאל — `?  = N` תמיד עם `gap-2` סימטרי משני הצדדים.
- לא להשתמש ב-`rtl:` של Tailwind על קומפוננט שמחליף סדר — עלולה להיות התנהגות כפולה עם `dir="rtl"` ב-root.
- טקסט אנגלי/מספר בתוך משפט עברי → עטוף ב-`<span dir="ltr">`.

## 15. StrictMode Safe

- **אל תכניס side-effects ל-setState updater** (`setLives(l => { sideEffect(); return l-1 })`). זה רץ פעמיים.
- העבר את ה-side-effect ל-`useEffect([lives])` או לפונקציה חיצונית.

## 16. Timer — RAF, לא setInterval

- `setInterval(fn, 1000)` דריפט ב-~30ms/min על מכשירים איטיים.
- השתמש ב-pattern של `MultiplicationChamp.jsx`: `performance.now()` + `requestAnimationFrame`.

## 17. Confetti — רק ב-level-up

- חגיגה על כל תשובה נכונה = inflation של פידבק. הילד מפסיק להעריך.
- Rule: `confetti() אם isLevelUp בלבד`.

## 18. Recent checklist למשחק חדש

- [ ] רמות 1-5 מוגדרות עם דלתא קושי ברורה
- [ ] Hints מדורגים (לא חושפני ב-L1-L4)
- [ ] Anti-cheat אם יש input ויזואלי רציף
- [ ] Lives רק אם טעות לא מלמדת
- [ ] startPos ≠ answer
- [ ] אין duplicate questions ברצף
- [ ] Dark mode: בדוק `dark:bg-slate-800 dark:text-slate-100` על כל קונטיינר
- [ ] iPhone SE: viewport 375×640 — אין overlap
- [ ] Header RankBadge מתעדכן
- [ ] `npm run build` נקי
