## TODO — הרחבת Reformation

> כל הפיצ'רים הבאים ממתינים לבניית הבסיס (6 הבאגים למעלה) ולהחלטה על מצב משחק (Classic / Reformation).

### א. מבנה נתונים חדש

**שרת — `utils.js`/`coup.js`:**
- `player.allegiance` — `'loyalist' | 'reformist' | null`
- `gameState.treasuryReserve` — מטבעות על קלף עתודת האוצר (מתחיל ב-0)
- `gameState.mode` — `'classic' | 'reformation'`

**Setup Reformation:**
- שחקן ראשון בוחר נאמנות, כל שחקן הבא מקבל הפוך מהקודם
- קלף Treasury Reserve מונח במרכז

### ב. הגבלת נאמנות

**חוק:** שחקן לא יכול לבצע Coup, Assassinate, Steal מ-, או לחסום Foreign Aid של — שחקן מאותה נאמנות (אלא אם כולם מאותה נאמנות).

**מימוש בשרת (`g-actionDecision`):**
```js
if(mode === 'reformation' && isTargetedAction) {
    const allSameAllegiance = players.every(p => p.allegiance === players[0].allegiance);
    if(!allSameAllegiance && source.allegiance === target.allegiance) {
        return; // reject
    }
}
```

**מימוש בלקוח (`ActionDecision.js`):**
- סנן יעדים לא-חוקיים מרשימת הכפתורים (גם client-side validation לUX)

### ג. Conversion (המרת נאמנות)

- **עלות:** 1 מטבע (עצמו) / 2 מטבעות (שחקן אחר) → לTreasury Reserve
- **ללא challenge/counteraction**
- **שרת:** action חדש `'conversion'`, לא challengeable, לא blockable
- **מימוש:** הפוך `player.allegiance`, הוסף מטבעות ל-`treasuryReserve`
- **לקוח:** כפתור בחירה "Convert Self (1c)" / "Convert Other (2c)"

### ד. Embezzlement (מעילה)

- **תנאי:** "אין לי Duke" (inverse challenge)
- **אפקט:** קח את כל מטבעות Treasury Reserve
- **אתגר:** כל שחקן יכול לאתגר שיש לך Duke
  - **יש לו Duke:** חייב להפסיד (concede) — מחזיר מטבעות, מפסיד השפעה
  - **אין לו Duke:** מציג קלפים למאתגר, מאתגר מפסיד, קלפי Embezzler מוחלפים בחפיסה
  - **ניתן לוותר מרצון** גם ללא Duke (לא לחשוף)

**מימוש:** action חדש `'embezzlement'`, הסגת חסימה הפוכה, server שולח קלפים פרטיים ב-socket ספציפי

### ה. Inquisitor Variant (מחליף Ambassador)

**מתי:** אפשרי כוריאנט בכל גודל משחק; **חובה** ל-7+ שחקנים.

**שתי יכולות (אחת לתור):**

**החלפה (Exchange):**
- שלוף **1** קלף מחפיסת החצר
- בחר אם להחליף עם אחד מקלפיך
- החזר 1 לחפיסה
- (שונה מ-Ambassador שמושך 2 ומחזיר 2)

**בחינה (Examine):**
- יריב בוחר קלף מקלפיו ומראה **לחוקר בלבד** (socket פרטי)
- חוקר מחליט: להחזיר כפי שהוא / לכפות על היריב לקחת קלף חדש מחפיסה
- חסום על שחקן מאותה נאמנות (ב-Reformation)
- Inquisitor גם **חוסם גניבה** (כמו Ambassador)

**מימוש שרת:**
- `constants.js`: הוסף `inquisitor` לקלפים, החלף `ambassador` ב-7+ שחקנים
- action חדש `'examine'`
- socket פרטי לתוצאת הבחינה (emit ל-socket ספציפי של החוקר)
- מצב `isExamineOpen` + `pendingExamineTarget`

**מימוש לקוח:**
- `ExamineDecision` component — מראה קלף היריב ושתי כפתורות ("Return" / "Force Swap")
- `ExamineResult` component — ליריב שצריך לבחור קלף חדש

### ו. Deck Scaling

| שחקנים | קלפים לכל דמות | סה"כ |
|--------|---------------|------|
| 2–6 | 3 | 15 |
| 7–8 | 4 | 20 |
| 9–10 | 5 | 25 |

**מימוש ב-`utils.js` (`addToDeck`):**
```js
function addToDeck(cardName, deck, count) {
    for(let i = 0; i < count; i++) {
        deck.push(cardName);
    }
}

buildDeck = (playerCount) => {
    const count = playerCount >= 9 ? 5 : playerCount >= 7 ? 4 : 3;
    // ...
}
```

### ז. שינויים ב-UI לReformation

- הצגת Allegiance card לכל שחקן (Loyalist/Reformist)
- Treasury Reserve מוצג כקלף מרכזי עם ספירת מטבעות
- כפתורי Conversion ו-Embezzlement ב-ActionDecision
- סינון יעדים לא-חוקיים (נאמנות זהה)
- Lobby: בחירת מצב משחק (Classic / Reformation) ע"י ה-host
