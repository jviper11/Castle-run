# CASTLE RUN — Master Card Upgrade Reference
Version 1.0 — All Characters + Shared Pool

---

## GDD BASE CARD FIXES REQUIRED
Before implementing, these base card entries need updating in GDD.md:

| Character | Key | Fix |
|---|---|---|
| Barbarian | `berserkersoath` | Change "each time you take damage" → "each time you lose HP for any reason" |
| Mage | `timewarp` | Base: Gain 2 Energy. Draw 1. High: Gain 2 Energy. Draw 2 |
| Mage | `coldmastery` | Change "Chill reduces enemy damage by 2 per stack" → "Chill reduces enemy attack by 35% instead of 25%" |
| Mage | `voidchannel` | Change "Discard 2 → double die roll. Exhaust" → "Discard 2 → set die to 5. Exhaust" |
| Mage | `spellecho` | Change type from Power → Skill |
| Gambler | `doubledown` | Fix typo `doubldown` → `doubledown`. Update wording → "Flip: win → double roll (capped at max). Lose → drop to 2" |
| Shared | `ragefuel` | Change type from Power → Skill everywhere it appears |

---

## ⚔️ BARBARIAN UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `heavyblow` | Heavy Blow+ | 2 | Deal 13 dmg. Even: Deal 19 dmg |
| `warshout` | War Shout+ | 1 | Gain 8 Block. Even: Gain 14 Block |
| `ironbash` | Iron Bash+ | 1 | Deal 10 dmg. Even: Deal 10 dmg + Vulnerable 2 |
| `brutalswing` | Brutal Swing+ | 1 | Deal 7 dmg twice. Even: Deal 8 dmg twice |
| `shieldbreaker` | Shield Breaker+ | 1 | Deal 9 dmg. Even: Deal 9 dmg + remove 8 enemy Block |
| `warcry` | War Cry+ | 0 | Gain 5 Block. Even: Gain 5 Block + draw 1 |
| `toughhide` | Tough Hide+ | 1 | Gain 9 Block. Even: Gain 13 Block |
| `bloodprice` | Blood Price+ | 0 | Lose 3 HP. Draw 2. Even: Lose 1 HP. Draw 2 |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `haymaker` | Haymaker+ | 2 | Deal 17 dmg. Even: Deal 24 dmg |
| `skullcrack` | Skull Crack+ | 1 | Deal 11 dmg + Weak 1. Even: Deal 11 dmg + Weak 3 |
| `recklesslunge` | Reckless Lunge+ | 1 | Deal 13 dmg, take 2. Even: Deal 19 dmg, take 2 |
| `battlecry` | Battle Cry+ | 1 | Gain 8 Block. Even: Gain 8 Block + draw 2 |
| `ironroar` | Iron Roar+ | 0 | Apply Weak 2 to enemy. Even: Apply Weak 3 to enemy |
| `bloodlust` | Blood Lust+ | 1 | Heal 6 HP. Even: Heal 11 HP |
| `entrench` | Entrench+ | 1 | Gain 11 Block, doesn't reset. Even: Gain 17 Block, doesn't reset |
| `overpowerattack` | Overpower+ | 1 | Deal 11 dmg. Even: Deal 11 dmg + Vulnerable 3 |
| `crushingblow` | Crushing Blow+ | 2 | Deal 15 dmg + remove 12 Block. Even: Deal 21 dmg + remove 12 Block |
| `warcallecho` | War Call+ | 0 | Draw 2 cards. Even: Draw 2 + Weak 1 to enemy |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `berserkersoath` | Berserker's Oath+ | Power | 2 | Each time you lose HP for any reason, gain 4 Block. Even: gain 7 Block |
| `warlordspresence` | Warlord's Presence+ | Power | 2 | All attacks +3 dmg. Even: All attacks +6 dmg |
| `ragefuel` | Rage Fuel+ | Power | 1 | Gain 2 Strength. Even: Gain 3 Strength |
| `deathrattle` | Death Rattle+ | Attack | 2 | Deal 20 dmg. Even: Deal 26 dmg (below 50% HP) |
| `laststand` | Last Stand+ | Skill | 1 | Gain 12 Block. Below 30%: gain 24. Even: Gain 16 Block. Below 30%: gain 32 |
| `battletrance` | Battle Trance+ | Skill | 1 | Gain 2 Energy. Lose 4 HP. Even: Gain 2 Energy. Lose 3 HP |

---

## 🔮 MAGE UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `frostbolt` | Frost Bolt+ | 1 | Deal 7 dmg. High: Deal 13 dmg + 2 Chill |
| `arcanebarrier` | Arcane Shield+ | 1 | Gain 6 Block. High: Gain 13 Block |
| `fireball` | Fireball+ | 1 | Deal 9 dmg + 2 Burn. High: Deal 15 dmg + 4 Burn |
| `manasurge` | Mana Surge+ | 0 | Next 2 cards cost 1 less |
| `arcaneboost` | Arcane Boost+ | 1 | Discard 1 → +2 die roll |
| `voidchannel` | Void Channel+ | 1 | Discard 1 → set die to 5. Exhaust |
| `spark` | Spark+ | 1 | Deal 6 dmg. High: Deal 9 dmg + 2 Burn |
| `flamtouch` | Flame Touch+ | 1 | Deal 7 dmg + 1 Burn. High: Deal 7 dmg + 4 Burn |
| `meditate` | Meditate+ | 1 | Draw 3. High: Draw 4 |
| `channelfocus` | Channel Focus+ | 1 | Gain 1 Energy. Draw 1 |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `icelance` | Ice Lance+ | 1 | Deal 9 dmg. High: Deal 16 dmg if enemy has Chill |
| `fireball` | Fireball+ | 1 | Deal 9 dmg + 2 Burn. High: Deal 15 dmg + 4 Burn |
| `combustion` | Combustion+ | 1 | Deal 4 dmg + 1 per Burn stack. High: Deal 6 dmg + 3 per Burn stack |
| `chainbolt` | Chain Bolt+ | 1 | Deal 7 dmg. High: Deal 7 dmg hit twice |
| `ignite` | Ignite+ | 1 | Apply 4 Burn. High: Apply 7 Burn |
| `arcanerecall` | Arcane Recall+ | 1 | Return 2 cards from discard. High: Return 3 cards |
| `manaweave` | Mana Weave+ | 1 | Next 2 cards cost 1 less. High: Next 3 cards cost 1 less |
| `frostfire` | Frost Fire+ | 2 | Deal 12 dmg. High: Deal 17 dmg. Apply both Burn and Chill effects regardless |
| `arcanebarrage` | Arcane Barrage+ | 1 | Deal 4 dmg + 2 per spell this turn. High: Deal 6 dmg + 2 per spell |
| `arcanesight` | Arcane Sight+ | 1 | Draw 3. High: Draw 4 |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `frozeninferno` | Frozen Inferno+ | Attack | 3 | Deal 22 dmg. Consumes all Burn and Chill stacks. High: Deal 30 dmg. Consumes all Burn and Chill stacks |
| `inferno` | Inferno+ | Attack | 2 | Apply 8 Burn. High: Apply 13 Burn |
| `timewarp` | Time Warp+ | Skill | 2 | Gain 2 Energy. Draw 2. High: Gain 2 Energy. Draw 3 |
| `spellecho` | Spell Echo+ | Skill | 1 | Next 2 Attacks trigger twice. High: Next 3 Attacks trigger twice. Exhaust |
| `coldmastery` | Cold Mastery+ | Power | 2 | Chill reduces enemy attack by 45% instead of 25% |
| `burningsoul` | Burning Soul+ | Power | 2 | Burn deals +3 per stack |

---

## 🗡️ THIEF UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `quickstrike` | Quick Strike+ | 1 | Deal 6 dmg twice. Odd: Deal 8 dmg twice |
| `shadowstep` | Shadow Step+ | 1 | Gain 6 Block. Odd: Gain 10 Block + draw 1 |
| `poisonblade` | Poison Blade+ | 2 | Deal 9 dmg. Odd: Deal 9 dmg + 4 Poison |
| `pickpocket` | Pick Pocket+ | 1 | Draw 3. Odd: Draw 3 + 8 Gold |
| `smokescreen` | Smoke Screen+ | 1 | Gain 9 Block. Discard 1 draw 1 |
| `swiftjab` | Swift Jab+ | 0 | Deal 4 dmg. Odd: Deal 6 dmg |
| `slipaway` | Slip Away+ | 0 | Draw 1 + 2 Block. Odd: Draw 2 + 2 Block |
| `cheapshot` | Cheap Shot+ | 1 | Deal 7 dmg + Weak 1. Odd: Deal 7 dmg + Weak 2 |
| `coinflick` | Coin Flick+ | 1 | Gain 8 Gold. Odd: Gain 8 Gold + draw 1 |
| `nimblepace` | Nimble Pace+ | 1 | Draw 3. Discard 1. Odd: Draw 4. Discard 1 |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `envenomdagger` | Envenom+ | 1 | Deal 6 dmg + 2 Poison. Odd: Deal 6 dmg + 5 Poison |
| `backstab` | Backstab+ | 1 | Deal 13 dmg. First card only. Odd: Deal 18 dmg. First card only |
| `cripple` | Cripple+ | 1 | Apply Weak 3 + Vulnerable 1. Odd: Apply Weak 3 + Vulnerable 2 |
| `shadowmark` | Shadow Mark+ | 1 | Next attack +7 dmg. Odd: Next attack +10 dmg |
| `poisoncloud` | Poison Cloud+ | 1 | Apply 6 Poison. Odd: Apply 8 Poison |
| `thiefsgambit` | Thief's Gambit+ | 1 | Deal 5 dmg. Draw 1. 8 Gold. Odd: Deal 7 dmg. Draw 1. 8 Gold |
| `bladedance` | Blade Dance+ | 1 | Deal 4 dmg three times. Odd: Deal 5 dmg three times |
| `disappear` | Disappear+ | 1 | Gain 7 Block. Next card costs 0. Odd: Gain 7 Block. Next 2 cards cost 0 |
| `concoction` | Concoction+ | 1 | Apply 3 Poison. Draw 1. Odd: Apply 4 Poison. Draw 2 |
| `gutpunch` | Gut Punch+ | 1 | Deal 6 dmg + 1 Poison. Odd: Deal 6 dmg + 3 Poison |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `deathmark` | Death Mark+ | Skill | 1 | Double Poison stacks. Draw 1. Exhaust. Odd: Triple Poison stacks. Draw 1. Exhaust |
| `shadowartist` | Shadow Artist+ | Power | 2 | 2nd, 3rd, and 4th card cost 0 |
| `poisonmaster` | Poison Master+ | Power | 2 | Poison deals +2 per stack |
| `lethalrhythm` | Lethal Rhythm+ | Power | 1 | Every 2 cards played deal 5 dmg |
| `assassinate` | Assassinate+ | Attack | 2 | Deal 17 dmg. 5+ Poison: deal 26. Odd: Deal 21 dmg. 5+ Poison: deal 32 |
| `goldenstrike` | Golden Strike+ | Attack | 1 | Deal dmg = Gold ÷ 8 (max 20). Odd: Deal dmg = Gold ÷ 6 (max 25) |

---

## 🧛 VAMPIRE UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `blooddrain` | Blood Drain+ | 1 | Deal 9 dmg. Extreme: Deal 9 dmg + heal 13 HP |
| `nightshroud` | Night Shroud+ | 1 | Gain 8 Block. Extreme: Gain 15 Block |
| `lifeleech` | Life Leech+ | 2 | Deal 13 dmg. Extreme: Deal 13 dmg + drain 18 Block |
| `crimsonbite` | Crimson Bite+ | 1 | Deal 7 dmg + 2 Regen. Extreme: Deal 9 dmg + 4 Regen |
| `darkembrace` | Dark Embrace+ | 1 | Lose 3 HP. Gain 11 Block |
| `bloodpulse` | Blood Pulse+ | 1 | Gain 4 Regen. Extreme: Gain 6 Regen |
| `draintouch` | Drain Touch+ | 1 | Deal 7 dmg. Extreme: Deal 7 dmg + heal 10 HP |
| `nightveil` | Night Veil+ | 1 | Gain 8 Block. Extreme: Gain 8 Block + 3 Regen |
| `darkblood` | Dark Blood+ | 0 | Lose 2 HP. Draw 2 |
| `swoopdown` | Swoop Down+ | 1 | Gain Fly + 3 Block. Extreme: Gain Fly + 6 Block |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `sanguinestrike` | Sanguine Strike+ | 1 | Deal 10 dmg + 2 Regen. Extreme: Deal 13 dmg + 4 Regen |
| `crimsonpact` | Crimson Pact+ | 1 | Lose 4 HP. Gain 4 Regen + draw 2. Extreme: Lose 3 HP. Gain 6 Regen + draw 2 |
| `bloodbank` | Blood Bank+ | 1 | Convert 8 HP into 14 Block. Extreme: Convert 6 HP into 18 Block |
| `drainlife` | Drain Life+ | 2 | Deal 15 dmg. Heal half dmg. Extreme: Deal 15 dmg. Heal full dmg |
| `batform` | Bat Form+ | 1 | Gain Fly + draw 2. Extreme: Gain Fly + draw 2 + 3 Regen |
| `shadowfeast` | Shadow Feast+ | 1 | Deal 8 dmg. Regen active: deal 13. Extreme: Deal 12 dmg. Regen active: deal 18 |
| `darkrite` | Dark Rite+ | 1 | Lose 6 HP. Gain 15 Block + 2 Regen. Extreme: Lose 4 HP. Gain 19 Block + 4 Regen |
| `bloodrush` | Blood Rush+ | 0 | Spend 3 HP. Next attack +9 dmg. Extreme: Spend 2 HP. Next attack +12 dmg |
| `nightstalk` | Night Stalk+ | 1 | Deal 6 dmg twice. Extreme: Deal 8 dmg twice + 3 Regen |
| `cursedveins` | Cursed Veins+ | 1 | Gain 4 Regen. Next card costs 0. Extreme: Gain 6 Regen. Next Skill costs 0 |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `bloodlord` | Blood Lord+ | Power | 2 | Heal 4 HP each time you deal damage |
| `eternalhunger` | Eternal Hunger+ | Power | 2 | Each Regen tick deals 4 dmg to enemy |
| `vampiricform` | Vampiric Form+ | Power | 2 | Fly activates + 4 Regen on rolls of 1 or max |
| `darkascension` | Dark Ascension+ | Skill | 2 | Lose 12 HP. Gain 24 Block + 6 Regen. Extreme: Lose 8 HP. Gain 32 Block + 8 Regen |
| `soulrend` | Soul Rend+ | Attack | 2 | Deal 19 dmg. Heal equal to dmg. Extreme: Deal 26 dmg. Heal equal to dmg |
| `bloodtide` | Blood Tide+ | Skill | 1 | Double Regen + heal 5 HP. Exhaust. Extreme: Triple Regen + heal 8 HP. Exhaust |

---

## 🎲 GAMBLER UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `highorlow` | High or Low+ | 1 | Roll 4-6: deal 18. Roll 2-3: deal 8 |
| `doubledown` | Double Down+ | 0 | Flip: win → set die to max. Lose → keep current |
| `luckystrike` | Lucky Strike+ | 2 | Deal 12 dmg. Max: Deal 28 dmg |
| `hedgebet` | Hedge Bet+ | 1 | Gain Block = roll + 2. Max: Gain Block = roll × 2 + 2 |
| `wildcard` | Wild Card+ | 1 | Deal dmg = roll × 2 + 2. Max: Deal dmg = roll × 3 + 2 |
| `longshot` | Long Shot+ | 1 | Roll 4-6: deal 14. Roll 2-3: deal 6. Max: Deal 20 dmg |
| `safepull` | Safe Pull+ | 1 | Gain 6 Block. Set die to 5. Max: Gain 8 Block. Set die to 5 |
| `risktaker` | Risk Taker+ | 0 | Reroll die. Draw 2. Max: Reroll die. Draw 2 + 3 Block |
| `oddscheck` | Odds Check+ | 1 | Draw 3. Roll 4+: draw 4. Max: Draw 3. Gain 8 Gold |
| `chipsin` | Chips In+ | 1 | Gain 8 Gold. Max: Gain 8 Gold + draw 1 |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `allin` | All In+ | 2 | Deal dmg = roll × 4 + 4. Max: Deal dmg = roll × 6 |
| `loadeddie` | Loaded Die+ | 1 | Set die to any value 3-6. Max: Set die to any value 4-6 |
| `pocketaces` | Pocket Aces+ | 1 | Next attack +(roll + 2) dmg. Max: Next attack +(roll × 2 + 2) dmg |
| `doubleornothing` | Double or Nothing+ | 1 | Deal 8 dmg. 50/50: deal 20 or take 4. Max: Deal 8 dmg. 50/50: deal 26 or take 2 |
| `counttheodds` | Count the Odds+ | 0 | Look at top 3. Keep 2 discard 1. Max: Look at top 4. Keep 3 discard 1 |
| `highstakes` | High Stakes+ | 1 | Gain Gold = roll × 4. Max: Gain Gold = roll × 6 + draw 1 |
| `bluff` | Bluff+ | 1 | Apply Weak 3 to enemy. Max: Apply Weak 3 + Vulnerable 2 |
| `wildcardcombo` | Wild Combo+ | 1 | Deal 5 dmg. Draw 2. Reroll. Max: Deal 7 dmg. Draw 2. Reroll |
| `pressyourluck` | Press Your Luck+ | 2 | Deal 13 dmg. Reroll — higher: +8. Max: Deal 17 dmg. Reroll — higher: +12 |
| `jackpot` | Jackpot+ | 1 | Gain Gold = roll × 5. Exhaust. Max: Gain 50 Gold + draw 1. Exhaust |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `houseedge` | House Edge+ | Power | 2 | Min die roll raised to 4 |
| `luckystreak` | Lucky Streak+ | Power | 1 | Each max roll draws 1 card + 6 dmg |
| `gamblersfallacy` | Gambler's Fallacy+ | Power | 2 | After 2 non-max rolls, next is guaranteed max |
| `bettingitall` | Betting It All+ | Attack | 3 | Deal dmg = Gold ÷ 4 (max 40). Exhaust. Max: Deal dmg = Gold ÷ 3 (max 50). Exhaust |
| `loadedhouse` | Loaded House+ | Skill | 1 | Next 3 rolls auto max. Exhaust. Max: Next 4 rolls auto max. Exhaust |
| `devilsdeal` | Devil's Deal+ | Skill | 1 | Gain 3 Energy. Lose Gold = roll × 8. Min cost 1. Max: Gain 3 Energy. Lose Gold = roll × 4. Min cost 1 |

---

## 🃏 SHARED POOL UPGRADES

| Key | Name | Type | Cost | Base Effect | Upgrade Effect |
|---|---|---|---|---|---|
| `ragefuel` | Rage Fuel+ | Skill | 1 | Gain 1 Strength. All attacks +1 dmg this combat | Attacks deal +3 dmg this turn. Draw 1 |
| `blizzard` | Blizzard+ | Attack | 2 | Deal 5 dmg 3 times | Deal 8 dmg 3 times |
| `stealheal` | Steal & Heal+ | Attack | 2 | Deal 10 dmg. Heal 5 HP | Deal 14 dmg. Heal 9 HP |
| `curseddice` | Cursed Die+ | Skill | 0 | Reroll die. Take 3 damage | Reroll die. Take 1 damage |
| `ironwall` | Iron Wall+ | Skill | 2 | Gain 14 Block | Gain 20 Block |
| `soulsteal` | Soul Steal+ | Attack | 1 | Deal 7 dmg. Gain 1 Soul | Deal 10 dmg. Heal 5 HP. Draw 1 |

---

## DESIGN NOTES

- **Berserker's Oath** triggers on ALL HP loss including self-damage cards — code must hook into bloodprice, recklesslunge, battletrance, darkembrace
- **Rage Fuel** base is Skill (whole combat buff). Upgrade is also Skill (this turn only) — intentionally different duration
- **Cold Mastery** uses percentage system consistent with Chill status (25% base → 35% with Power → 45% upgraded)
- **Spell Echo** is a Skill not a Power — one-time effect, not ongoing passive
- **Double Down** base has precise flip rules — win: double roll capped at max. Lose: drop to 2
- **Devil's Deal** minimum cost of 1 Energy must be enforced regardless of discounts
- **Soul Steal+** upgrade removes Soul gain — trades meta currency for combat utility
