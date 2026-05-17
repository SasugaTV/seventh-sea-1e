# 7th Sea — 1st Edition (Foundry VTT v12 Game System)

An unofficial Foundry VTT game system implementing **AEG's 7th Sea, 1st Edition** (1999).
Faithfully supports the *Roll & Keep* dice mechanic, Heroes, Villains, Brute Squads,
Monsters, Traits, Skills & Knacks, Advantages, Backgrounds, Stories, Swordsman Schools,
and Sorceries.

> **Disclaimer.** *7th Sea* is © Alderac Entertainment Group / John Wick Presents / Chaosium.
> This is an unofficial fan-made Foundry VTT system. No game content (text, art, stat blocks)
> from any published 7th Sea book is included — this repository only provides the *mechanical
> framework* needed to play. Bring your own books.

---

## Features

- **Actor types**
  - **Hero** — full sheet: Traits, Skills/Knacks, Advantages, Backgrounds, Stories,
    Inventory, Sorcery & Schools, Reputation, Drama Dice, Hubris, Arcana, Wounds.
  - **Villain** — Hero sheet plus Villainy rating and Henchmen Limit.
  - **Brute Squad** — compact tracker with Threat, TN, brute count, "Take a Hit" button.
  - **Monster** — simplified combatant with monstrous-ability text block.
- **Item types** — Skill, Knack, Advantage, Background, Story, Weapon, Armor, Gear,
  Swordsman School, Sorcery.
- **Dice engine** — true Roll & Keep:
  - `XkY` exploding-10 pools (`{n}d10x10kh{k}` under the hood)
  - Target Numbers, called Raises (`+5` per raise), success/failure chat cards
  - **Spend a Drama Die** button right on the chat card to add another exploding d10
  - Per-knack rolls (auto-fills Trait + Rank from the knack item)
  - Per-trait rolls (auto-fills Trait k Trait)
- **Initiative** — uses Wits + Panache keep Panache.
- **Derived stats** — passive/active Defense TN from parry knacks, Flesh Wound threshold
  from Resolve × 2, Dramatic Wound cap from Resolve, Drama Dice cap from Panache.
- **Compendium scaffolding** — ready for LevelDB pack drop-in (see `packs/README.md`).
- **Theming** — parchment / oxblood / brass styling.

## Installation

### From manifest URL (recommended once published)

1. In Foundry VTT, go to **Game Systems → Install System**.
2. Paste the manifest URL into the bottom field:

   ```
   https://github.com/SasugaTV/seventh-sea-1e/releases/latest/download/system.json
   ```

3. Click **Install**.

### Manual install

1. Download or `git clone` this repo.
2. Copy the entire `seventh-sea-1e/` folder into your Foundry data directory under
   `Data/systems/` (so you end up with `Data/systems/seventh-sea-1e/system.json`).
3. Restart Foundry and create a new World using **7th Sea (1st Edition)**.

## Publishing your own fork

1. Create a public GitHub repo named (e.g.) `seventh-sea-1e`.
2. Search-and-replace your GitHub
   handle. The fields to update are:

   - `system.json` → `authors[0].url`, `url`, `manifest`, `download`, `bugs`, `changelog`
   - `README.md` (this file)

3. Push to `main`.
4. Tag a release: `git tag v0.1.0 && git push --tags`.
5. The GitHub Action in `.github/workflows/release.yml` will automatically:
   - Bump the manifest version to the tag,
   - Zip the system folder as `seventh-sea-1e.zip`,
   - Attach both `system.json` and the zip to the GitHub release.

Foundry's `manifest` URL points at `releases/latest/download/system.json`, so users will
auto-update whenever you publish a new tagged release.

## Repo layout

```
seventh-sea-1e/
├── system.json                    Manifest (Foundry reads this first)
├── template.json                  Actor/Item data schemas
├── module/
│   ├── seventh-sea.mjs            ES-module entry point
│   ├── documents/
│   │   ├── actor.mjs              Hero/Villain/Brute/Monster derived data
│   │   └── item.mjs               Knack roll math, weapon damage formula
│   ├── sheets/
│   │   ├── actor-sheet.mjs        Unified ActorSheet
│   │   └── item-sheet.mjs         Unified ItemSheet
│   ├── helpers/
│   │   ├── config.mjs             SS1E config constants
│   │   ├── handlebars.mjs         Custom Handlebars helpers
│   │   └── templates.mjs          Partial preloading
│   └── dice/
│       └── roll-and-keep.mjs      The Roll & Keep engine
├── templates/
│   ├── actor/                     One .hbs per actor type, parts in actor/parts/
│   └── item/                      One .hbs per item type
├── css/seventh-sea.css
├── lang/en.json
├── packs/                         (drop your LevelDB compendiums here)
├── .github/workflows/release.yml  Auto-publish on git tag
├── LICENSE
└── README.md
```

## House rules built in

A few common house options are wired in by default; you can change them in
`module/documents/actor.mjs` and `module/dice/roll-and-keep.mjs`:

- Flesh Wound threshold = Resolve × 2 (some tables use Resolve × 5).
- Drama Dice maximum each session = Panache.
- Dice rolled cap = 10. Overflow converts at 2:1 into kept dice (1e Players Guide v2).

## Contributing

PRs welcome. Style points:

- ES modules only, no Webpack.
- Handlebars templates use `{{localize "SS1E.…"}}` for everything user-facing.
- No bundled book content — adventure modules belong in their own repos.

## License

This system is released under the [MIT License](./LICENSE). 7th Sea, 7th Sea: First
Edition, and all related trademarks remain property of their respective owners.
