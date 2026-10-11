# Changelog

All notable changes to this system will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Ship** actor type and sheet, from the 1st Edition Players' Guide "Ship Design"
  (pp. 194-199) and the Game Masters' Guide "Naval Battles":
  - Five ship Traits (Cannons, Crew Skill, Hull, Rudder, Sails) bought with ship
    points, with Modification bonuses and dice lost to Critical Hits tracked separately.
  - Ship Maximums chart, point budget (points + flaws vs. Traits + modifications),
    and live warnings for over-max Traits, Modifications and Flaws, duplicates, opposed
    picks, and Port/Starboard cannons that don't add up to Brawn.
  - Full Modification and Flaw lists with costs and rule text; custom rows allowed.
  - Derived Draft, Cargo, Crew, Drama Dice, TN to Hit, speed, turn cost, and
    sinking threshold.
  - Rolls: Trait rolls with Duty Lead Knack bonus, Port/Starboard broadsides
    (Finesse to hit, then cannon dice), Hit Check, and Panache Phase roll.
    Flaws that stop dice exploding switch off explosions automatically.
  - Duty Leads, crew roster, cargo manifest, upkeep reminders, notes.

## [0.1.0] - Initial release

### Added
- Foundry VTT v12 manifest (`system.json`) and data templates (`template.json`).
- Actor types: Hero, Villain, Brute Squad, Monster.
- Item types: Skill, Knack, Advantage, Background, Story, Weapon, Armor, Gear,
  Swordsman School, Sorcery.
- Roll & Keep dice engine with exploding 10s, TN/Raises, and Drama Die chat-card button.
- Trait-roll, Knack-roll, Initiative-roll, and generic Roll & Keep buttons on sheets.
- Derived stats: Passive/Active Defense TN, Flesh Wound threshold, Dramatic Wound cap.
- Compendium scaffolding (`packs/`).
- GitHub Actions release workflow.
- MIT license.
