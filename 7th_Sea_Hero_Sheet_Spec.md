# 7th Sea (1st Edition) — Hero Character Sheet
## Clean-Room Specification

### Overview
A single-page hero character sheet for the 7th Sea tabletop RPG (1st Edition). It consolidates all core character data into a compact, scrollable layout organized into three horizontal bands, followed by skills, advantages, and biography sections. The sheet supports inline dice rolls, dynamic dot-tracking, and drag-and-drop item management via FoundryVTT.

---

### Top Utility Strip
A thin toolbar at the very top with two groups:
- **Font size controls**: A minus button and a plus button to decrease/increase the sheet's text size globally.
- **Generic roll button**: A single button that opens a roll dialog for ad-hoc dice rolls.

---

### Row 1 — Core Stats & Identity
Two-column layout.

#### Left Column

**Traits Panel**
- Displays six core traits as labeled rows (e.g., Agility, Brawn, Perception, etc.).
- Each trait row shows a clickable label that triggers a dice roll for that trait.
- Next to each trait is a dot tracker (visual indicator showing the current numeric value up to a maximum of 7, with a visual gap at rank 5).

**Initiative Panel**
- A clickable label/button to roll initiative.
- Displays the initiative dice formula (e.g., "4k3").
- An editable numeric field for tracking a current/initiative value.
- A "Tracked" label next to the field.

#### Right Column

**Character Info Panel**
- **Name**: Editable text field (also displayed as a prominent title above the weapons row).
- **Nationality**: Single-line text input.
- **Arcana**: Single-line text input.
- **Membership**: Single-line text input.
- **Profession**: Single-line text input.

**XP & Resources Panel**
- **Income**: Text input for the character's income value.
- **XP (current)**: Number input for earned experience points.
- **XP (total/derived)**: Read-only display showing total accumulated XP.
- **Drama Dice**: A number input flanked by minus and plus buttons for adjusting the count, displayed with a maximum cap (e.g., "3 / 5").

---

### Row 2 (a) — Reputation, Backgrounds, Accoutrements
Three panels in a horizontal row.

**Reputation Panel**
- A header row showing a cap value (number input), a slash, and a read-only total display.
- Below: a list of reputation entries, each with a text field (name/source) and a numeric value field (range -999 to 999).
- Supports adding/removing entries dynamically.

**Backgrounds Panel**
- A list of background entries.
- Each entry has a text field (background name) and a numeric field (points, 0–9).
- Supports dynamic add/remove rows.

**Accoutrements Panel**
- A list of accoutrement/wealth items split into two columns (items 0–4 on the left, 5+ on the right).
- Each entry has a text field (item name) and a numeric field (value, 0–999).
- Supports dynamic add/remove rows.

---

### Row 2 (b) — Contacts, Languages, Wealth
Three panels in a horizontal row.

**Contacts Panel**
- A list of contact entries.
- Each entry has three fields: Name (text), Favor (number, 0–9), and Role (text).
- Supports dynamic add/remove rows.

**Languages Panel**
- Header row with an optional extra label input and a "RW" (Reading/Writing) indicator.
- Each language entry has three fields: Name (text), Rank (number), and a read/write dot indicator (toggleable dot between read and write).
- Supports dynamic add/remove rows.

**Wealth Panel**
- A list of wealth items split into two columns (items 0–4 on the left, 5+ on the right).
- Each entry has a text field (item name) and a numeric field (value, 0–999).
- Supports dynamic add/remove rows.

---

### Row 3 — Combat & Skills
Contains a character name title above the section, followed by the combat/skills area.

#### Combat Row (Three Panels)

**Weapons Panel**
- A table-style layout with columns for each weapon entry:
  - **Name**: Text input.
  - **Attack Roll**: Two number inputs (dice count and keep count) separated by a "k" label, plus a clickable sword icon to roll.
  - **Damage Roll**: Two number inputs (dice count and keep count) separated by a "k" label, plus a clickable star icon to roll.
  - **Notes**: Text input.
  - **Range**: Text input.
  - **Short Mod**: Text input.
  - **Long Mod**: Text input.
  - **Reload**: Text input.
- Supports dynamic add/remove weapon rows.

**Defense Panel**
- A table with columns: Which (label), Passive TN (number), Active TN (number).
- Each defense row has a clickable label that rolls a defense check.
- Rows beyond the default set have edit and delete buttons.
- An "Add Defense" button to add new rows.

**Wounds & Composure Panel**
- **Wounds section**:
  - A clickable label to roll a wound check, with a formula display (e.g., "3k3").
  - **Flesh Wounds**: Numeric input for current flesh wounds.
  - **Dramatic Wounds**: Two dot-trackers (columns) showing dramatic wound levels up to a maximum.
- **Composure section**:
  - A clickable label to roll a composure check, with a formula display (e.g., "4k4").
  - **Embarrassment**: Numeric input for current embarrassment level.
  - **Humiliations**: Two dot-trackers (columns) showing humiliation levels up to a maximum.

---

### Skills & Knacks Section
- A section heading "Skills and Knacks".
- A grid of skill columns (multiple cells per row).
- Each skill cell displays:
  - An editable skill name (text input).
  - A delete button (×) for the skill.
  - A list of associated knacks, each showing:
    - A clickable knack name (triggers a roll).
    - A dot tracker for the knack rank (0–6, with visual gap at 5).
    - An edit button (pencil icon).
    - A delete button (×).
  - A "+ Knack" button to add a new knack to this skill.
- A "+ Skill" button at the bottom to add a new skill column.

---

### Advantages Drawer (Collapsible)
A collapsible section with two sub-lists:

**Advantages**
- A list of advantage entries.
- Each entry shows the name, a cost in parentheses (e.g., "(2 HP)"), an edit button, and a delete button.
- A "+" button to create a new advantage.

**Flaws**
- A list of flaw entries.
- Each entry shows the name, a cost in parentheses (e.g., "(+1 HP)"), an edit button, and a delete button.
- A "+" button to create a new flaw.

---

### XP Log Drawer (Collapsible)
A collapsible section with a total XP readout in the header.

**XP Log Table**
- Columns: Label (text input), Amount (number input), Delete (× button).
- Each row represents an XP entry with an editable label and amount.
- A "+ XP Log Entry" button to add new rows.

---

### Biography Section
- A titled "Biography" header.
- A multi-line textarea for the character's biography/narrative text.
- Supports rich text editing (WYSIWYG).

---

### Supported Item Types (via drag-and-drop or creation buttons)
- **Skills**: General skill entries with category classification.
- **Knacks**: Special abilities tied to a specific skill, with a rank value.
- **Advantages**: Beneficial traits with a HP cost.
- **Flaws**: Detrimental traits with a HP bonus (negative cost).
- **Backgrounds**: Character background entries with point values.
- **Stories**: Story arcs with a completion flag.
- **Sorceries**: Magical abilities with tradition type and bloodline indicators (pure, half-blood, twisted-blood).
- **Schools**: Sorcery schools with a rank.
- **Weapons**: Combat entries with attack/damage formulas and range/modifiers.
- **Armor**: Protective gear with a soak value.
- **Gear**: Miscellaneous items with a quantity multiplier.

---

### Interactive Features
- **Inline rolling**: Clickable labels and icons trigger dice rolls directly from the sheet.
- **Dot trackers**: Visual dot-based indicators replace raw numbers for traits, knacks, dramatic wounds, and read/write status.
- **Dynamic rows**: All list-based sections (reputation, backgrounds, accoutrements, contacts, languages, wealth, weapons, defenses, skills, knacks, advantages, flaws, XP log) support adding and removing rows dynamically.
- **Font scaling**: Global font size adjustment via the top utility strip.
- **Collapsible drawers**: Advantages and XP Log sections can be collapsed/expanded.
- **Rich text biography**: Supports formatted text input for narrative content.

---

### Roll Dialog (Roll & Keep Prompt)
Every clickable roll trigger (trait, knack, weapon, wound check, composure check, defense, generic roll) opens the same dialog. Fields:

| Field | Default Value | Range |
|---|---|---|
| **Roll** | See Formula Computation below | 0–20 |
| **Keep** | See Formula Computation below | 0–10 |
| **Bonus** | 0 | any integer |
| **TN (Target Number)** | 5 (system default) | 5+ (step 5) |
| **Raises** | 0 | 0–10 |
| **Result Mode** | "Both" | Highest / Lowest / Both |

The dialog has two buttons: **Roll** (executes the roll with entered values) and **Cancel** (aborts). "Result Mode" determines what results are shown on the chat card:
- **Both** (default): Show both High and Low results
- **Highest**: Show only the High result
- **Lowest**: Show only the Low result

---

### Formula Computation

#### Two-Pool Model
Every roll uses two pools:

| Pool | Composition | Purpose |
|---|---|---|
| **Kept Pool (Counted)** | Trait value + Bonus Kept Dice (+ Exploded Dice later) | Dice that will be summed for results |
| **Unkept Pool (Rolled, Ignored)** | Knack Rank + Bonuses (as dice counts) | Inflates the pool for tension/suspense; does not affect either total |

**Roll** = Kept Pool count + Unkept Pool count
**Keep** = Kept Pool count (number of dice to count from the rolled pool)

The extra unkept dice create variance: a larger pool means a wider spread between high and low results, even though only the kept dice matter for the final numbers.

#### Trait Roll
```
Kept = trait_value
Unkept = 0
roll = trait_value
keep = trait_value
```
Example: Wits 4 → **4k4** (4 dice rolled, count all 4)

#### Knack Roll
```
Kept = trait_value
Unkept = knack_rank
roll = trait_value + knack_rank
keep = trait_value
```
Example: Finesse 4 + Knack Rank 3 → **7k4** (roll 7 dice, count the best/worst 4)

Example: Finesse 5 + Knack Rank 8 → **13k5** (roll 13 dice, count the best/worst 5 — the 8 unkept dice create wide variance)

#### Weapon Roll
Uses the attack/damage formula stored on the weapon row directly:
- **Attack**: `system.weapons.rows.{i}.atk1.{roll, keep}` — roll dice, count kept, compare to TN
- **Damage**: `system.weapons.rows.{i}.dmg1.{roll, keep}` — same mechanic, separate pool

#### Wound Check
```
Kept = brawn_value
Unkept = 0
roll = brawn_value
keep = brawn_value
```
Example: Brawn 3 → **3k3**

#### Composure Check
```
Kept = panache_value
Unkept = 0
roll = panache_value
keep = panache_value
```
Example: Panache 4 → **4k4**

#### Initiative
```
Kept = wits_value + panache_value
Unkept = 0
roll = wits_value + panache_value
keep = panache_value
```
Example: Wits 4 + Panache 3 → **7k3**

#### Defense Roll
```
Kept = wits_value + active_defense_value
Unkept = 0
roll = wits_value + active_defense_value
keep = wits_value
```
Example: Wits 4 + Active Defense 2 → **6k4**

---

### Roll & Keep Engine
The engine implements the core mechanic with dual-result support:

1. **Build formula string**: `{roll}d10x10kh{keep}` — roll N d10 dice, explode (reroll and add) on 10s, keep the highest K.
2. **Evaluate**: Foundry's Roll API computes the total and individual die results.
3. **Calculate dual results from the Kept Pool**:
   - **High Result**: Sum of the *highest N* dice (where N = keep count) **+ Bonus Points**
   - **Low Result**: Sum of the *lowest N* dice (where N = keep count) **− Bonus Points**
   - **Success**: `High Result >= finalTN`
   - **Raises Earned**: `max(0, floor((High Result - defaultTN) / 5))`
   - **Raises Met**: If raises were requested and the roll succeeded, the raises are counted as met.
4. **Post chat card** (see below).

---

### Chat Card Output
After a roll, a chat message is posted with a styled card:

```
┌─────────────────────────────────────┐
│ [Flavor Text: "Knack Roll: Swordsman"] │
├─────────────────────────────────────┤
│ 7k4 vs TN 5 (0 raises)            │
│ High: 22 · Low: 11                │
│ 22 — Success · 2 raises earned    │
├─────────────────────────────────────┤
│ [Dice tooltip: expanded dice results]│
├─────────────────────────────────────┤
│ [Spend Drama Die]                  │
└─────────────────────────────────────┘
```

- **Header**: Flavor text (e.g., the knack name or character name).
- **Line 1**: Formula (`{roll}k{keep}`) vs Target Number, with raise info if applicable.
- **Line 2**: High and Low results side by side.
- **Line 3**: Success/failure based on High result, with raises earned.
- **Tooltip**: Expanded dice results (clickable to see individual die values).
- **Footer**: "Spend Drama Die" button (only if the roll has an associated actor).

Result mode filter:
- **"Both"** (default): Shows both High and Low on Line 2.
- **"Highest"**: Shows only High on Line 2.
- **"Lowest"**: Shows only Low on Line 2.

---

### Drama Die Spend Button
Each chat card from a roll with an associated actor includes a **"Spend Drama Die"** button in the footer. Clicking it:
- Deducts 1 drama die from the actor's `system.resources.dramaDice.value`.
- Applies the drama die as a bonus to the roll (or rerolls, depending on the flags data).
- Updates the chat card with the new result.

The roll data is stored in the message flags:
```
flags.seventh-sea-1e.rollData = {
  roll: N,
  keep: K,
  bonus: B,
  tn: TN,
  raises: R
}
```

---

### Roll Data Model
| Section | Key Data Path |
|---|---|
| Traits | `system.traits.{key}.value` |
| Initiative | `system.initiative.{dice, keep, value}` |
| Character Info | `system.charInfo.{nationality, arcana, membership, profession}` |
| Resources | `system.resources.{income, xp.{value, total}, dramaDice.{value, max}}` |
| Reputation | `system.reputation.{cap, total, entries[].text, entries[].value}` |
| Backgrounds | `system.backgrounds.rows[].{text, value}` |
| Accoutrements | `system.accoutrements.rows[].{text, value}` |
| Contacts | `system.contacts.rows[].{name, favor, role}` |
| Languages | `system.languages.{extraLabel, rows[].{name, rank, rw}}` |
| Wealth | `system.wealth.rows[].{text, value}` |
| Weapons | `system.weapons.rows[].{name, atk1.{roll, keep}, dmg1.{roll, keep}, notes, range, shtMod, lngMod, reload}` |
| Defense | `system.defense.rows[].{label, passive, active}` |
| Wounds | `system.wounds.{flesh.value, dramatic.{max, cols[]}}` |
| Composure | `system.composure.{embarrassment.value, humiliations.{max, cols[]}}` |
| Skills/Knacks | Item-based (FoundryVTT item system) |
| Advantages/Flaws | Item-based (FoundryVTT item system) |
| Biography | `system.biography` |
