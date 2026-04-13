# CASTLE RUN — Master Card Upgrade Reference
Version 2.0 — All Characters + Shared Pool
*Last updated: April 2026*

---

## IMPLEMENTATION STATUS

| Hero | Base Cards | Upgrades | Status |
|---|---|---|---|
| Barbarian | ✅ All coded | ✅ All coded | Complete |
| Mage | ✅ All coded | ✅ All coded | Complete |
| Thief | ✅ All coded | ✅ All coded | Complete |
| Vampire | ✅ All coded | ✅ All coded | Complete |
| Gambler | ✅ All coded | ✅ All coded | Complete |
| Shared Pool | ✅ All coded | ✅ All coded | Complete |

### Cards in GDD but NOT yet coded
These cards appear in GDD v0.9 card pool tables but have no implementation yet:

| Hero | Key | Name |
|---|---|---|
| Thief | `thiefsgambit` | Thief's Gambit |
| Thief | `gutpunch` | Gut Punch |
| Vampire | `cursedveins` | Cursed Veins |
| Gambler | `wildcardcombo` | Wild Combo |
| Gambler | `pressyourluck` | Press Your Luck |
| Gambler | `jackpot` | Jackpot |
| Thief | `goldenstrike` | Golden Strike |

These cards and their upgrades should be implemented in a future session.

---

## DESIGN DECISIONS LOCKED

- **Blood Lord / Blood Lord+** — heals once per Attack card played, NOT per hit. Multi-hit cards (Blade Dance, Night Stalk) only heal once.
- **Eternal Hunger+** — Regen ticks deal 2 dmg (not 4), capped at 15 damage per turn total.
- **Shadow Artist+** — first 3 cards each turn cost 1 less (not free). Cannot reduce below 0.
- **Death Mark+** — doubles/triples Poison stacks with a hard cap of 20 stacks max.
- **Time Warp** — redesigned as draw-focused. Cost 1. Gives energy back as bonus, not primary effect.
- **Void Channel+** — discard 2, roll 3 times, keep highest result. NOT triple die.
- **Loaded House+** — next 2 rolls auto-max (base: 2, max roll bonus: 3). NOT 3-4.
- **Cold Mastery+** — 50% damage reduction (not 45%).
- **Arcane Momentum** — lasts whole combat (Power status persists). Resets cap of +3 per turn at start of each turn.
- **Gambler's Fallacy+** — threshold reduced to 2 non-max rolls (base: 3).
- **Devil's Deal** — minimum gold cost of 1 always enforced.
- **Entrench / Entrench+** — all block accumulated that turn persists (not just Entrench's own block).

---

## ⚔️ BARBARIAN UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `heavyblow` | Heavy Blow+ | 2 | Deal 13 dmg. Even: Deal 21 dmg |
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
| `entrench` | Entrench+ | 1 | Gain 11 Block. All block persists to next turn. Even: Gain 17 Block |
| `overpowerattack` | Overpower+ | 1 | Deal 11 dmg. Even: Deal 11 dmg + Vulnerable 3 |
| `crushingblow` | Crushing Blow+ | 2 | Remove 12 enemy Block, then deal 15 dmg. Even: deal 21 dmg |
| `warcallecho` | War Call+ | 0 | Draw 2 cards. Even: Draw 2 + Weak 1 to enemy |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `berserkersoath` | Berserker's Oath+ | Power | 2 | Exhaust. HP loss grants 4 Block instead of 3 |
| `warlordspresence` | Warlord's Presence+ | Power | 2 | Exhaust. All attacks deal +3 Strength this combat |
| `ragefuel` | Rage Fuel+ | Power | 1 | Exhaust. Gain 2 Strength this combat |
| `deathrattle` | Death Rattle+ | Attack | 2 | Deal 20 dmg. ⚠️ Requires ≤50% HP. Even: Deal 26 dmg |
| `laststand` | Last Stand+ | Skill | 1 | Gain 12 Block. Below 30%: gain 24. Even: Gain 16 Block. Below 30%: gain 32 |
| `battletrance` | Battle Trance+ | Skill | 1 | Gain 2 Energy. Lose 4 HP. Even: Gain 2 Energy. Lose 2 HP |

---

## 🔮 MAGE UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `frostbolt` | Frost Bolt+ | 1 | Deal 7 dmg. High: Deal 13 dmg + 2 Chill |
| `arcanebarrier` | Arcane Shield+ | 1 | Gain 6 Block. High: Gain 13 Block |
| `manasurge` | Mana Surge+ | 0 | Next 2 cards cost 1 less this turn |
| `arcaneboost` | Arcane Boost+ | 0 | Discard 1 card — add 2 to dice roll |
| `voidchannel` | Void Channel+ | 1 | Discard 2 cards — roll 3 times, keep highest result |
| `spark` | Spark+ | 1 | Deal 6 dmg. High: Deal 10 dmg + 2 Burn |
| `flametouch` | Flame Touch+ | 1 | Deal 7 dmg + 2 Burn. High: Deal 7 dmg + 5 Burn |
| `meditate` | Meditate+ | 0 | Draw 2 cards. High: draw 3 |
| `channelfocus` | Channel Focus+ | 0 | Gain 1 Energy + draw 1. High: Gain 2 Energy + draw 1 |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `icelance` | Ice Lance+ | 1 | Deal 9 dmg. High: Deal 16 dmg if enemy has Chill |
| `combustion` | Combustion+ | 1 | Deal 4 dmg + 2 per Burn stack. High: Deal 6 dmg + 2 per Burn stack |
| `chainbolt` | Chain Bolt+ | 1 | Deal 7 dmg. High: Deal 7 dmg twice |
| `ignite` | Ignite+ | 1 | Apply 4 Burn. High: Apply 7 Burn |
| `arcanerecall` | Arcane Recall+ | 0 | Return 1 card from discard. High: Return 2 cards. Free |
| `manaweave` | Mana Weave+ | 0 | Next card costs 1 less. High: next 2 cards cost 1 less. Free |
| `frostfire` | Frost Fire+ | 2 | Deal 13 dmg. Has Burn: add 3 Chill. Has Chill: add 3 Burn. High: Deal 18 dmg |
| `arcanebarrage` | Arcane Barrage+ | 1 | Deal 4 dmg + 2 per Skill/Power played this turn. High: Deal 6 dmg + 2 per Skill/Power |
| `arcanesight` | Arcane Sight+ | 0 | Draw 2 cards. High: draw 4. Free |
| `arcanemomentum` | Arcane Momentum+ | 0 | Each Skill/Power played this combat adds +1 to dice (max +3 per turn). Free |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `frozeninferno` | Frozen Inferno+ | Attack | 3 | Deal 24 dmg. Consumes all Burn + Chill stacks. High: Deal 34 dmg |
| `inferno` | Inferno+ | Attack | 2 | Apply 8 Burn. High: Apply 13 Burn |
| `timewarp` | Time Warp+ | Skill | 1 | Draw 2. Gain 2 Energy. High: Draw 4 + gain 3 Energy |
| `spellecho` | Spell Echo+ | Skill | 1 | Exhaust. Next Attack triggers twice. High: next 2 Attacks trigger twice |
| `coldmastery` | Cold Mastery+ | Power | 1 | Exhaust. Chill reduces enemy attack by 50% instead of 25% |
| `burningsoul` | Burning Soul+ | Power | 1 | Exhaust. Burn deals +2 damage per stack |

---

## 🗡️ THIEF UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `quickstrike` | Quick Strike+ | 1 | Deal 6 dmg twice. Odd: Deal 8 dmg twice |
| `shadowstep` | Shadow Step+ | 1 | Gain 6 Block. Odd: Gain 10 Block + draw 2 |
| `poisonblade` | Poison Blade+ | 2 | Deal 9 dmg. Odd: Deal 9 dmg + 5 Poison |
| `pickpocket` | Pick Pocket+ | 1 | Draw 2 cards. Odd: Draw 2 + gain 8 Gold |
| `smokescreen` | Smoke Screen+ | 1 | Gain 9 Block. Discard 1, draw 1 |
| `swiftjab` | Swift Jab+ | 0 | Deal 4 dmg. Odd: Deal 7 dmg |
| `slipaway` | Slip Away+ | 0 | Draw 2 cards. Odd: Draw 2 + gain 3 Block |
| `cheapshot` | Cheap Shot+ | 1 | Deal 7 dmg + Weak 1. Odd: Weak 3 |
| `coinflick` | Coin Flick+ | 0 | Gain 6 Gold. Odd: Gain 6 Gold + draw 1. Free |
| `nimblepace` | Nimble Pace+ | 1 | Draw 3, discard 1. Odd: Draw 4, discard 1 |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `envenomdagger` | Envenom+ | 1 | Deal 6 dmg + 3 Poison. Odd: Deal 6 dmg + 6 Poison |
| `backstab` | Backstab+ | 1 | Deal 13 dmg. First card only. Odd: Deal 18 dmg |
| `cripple` | Cripple+ | 1 | Apply Weak 3 + Vulnerable 2. Odd: Weak 3 + Vulnerable 3 |
| `shadowmark` | Shadow Mark+ | 1 | Next attack deals +8 dmg. Odd: Next attack +12 dmg |
| `poisoncloud` | Poison Cloud+ | 1 | Apply 6 Poison. Odd: Apply 9 Poison |
| `bladedance` | Blade Dance+ | 1 | Deal 4 dmg three times. Odd: Deal 6 dmg three times |
| `disappear` | Disappear+ | 0 | Gain 8 Block. Next card costs 0. Odd: Next 2 cards cost 0. Free |
| `concoction` | Concoction+ | 1 | Apply 3 Poison + draw 2. Odd: Apply 5 Poison + draw 2 |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect |
|---|---|---|---|---|
| `deathmark` | Death Mark+ | Skill | 1 | Double Poison stacks (max 20). Exhaust. Odd: Triple stacks (max 20). Exhaust |
| `shadowartist` | Shadow Artist+ | Power | 1 | Exhaust. First 3 cards each turn cost 1 less |
| `poisonmaster` | Poison Master+ | Power | 2 | Exhaust. Poison deals +2 dmg per stack |
| `lethalrhythm` | Lethal Rhythm+ | Power | 1 | Exhaust. Every 2 cards played deals 5 dmg |
| `assassinate` | Assassinate+ | Attack | 2 | Deal 18 dmg. 5+ Poison: deal 28. Odd: Deal 22 dmg. 5+ Poison: deal 34 |

---

## 🧛 VAMPIRE UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `blooddrain` | Blood Drain+ | 1 | Deal 9 dmg. Extreme: Deal 9 dmg + heal 13 HP |
| `nightshroud` | Night Shroud+ | 1 | Gain 7 Block. Extreme: Gain 15 Block |
| `lifeleech` | Life Leech+ | 2 | Deal 13 dmg. Extreme: Drain 18 Block |
| `crimsonbite` | Crimson Bite+ | 1 | Deal 7 dmg. Extreme: Apply 3 Poison |
| `darkembrace` | Dark Embrace+ | 1 | Lose 3 HP, gain 12 Block |
| `bloodpulse` | Blood Pulse+ | 1 | Gain 3 Regen. Extreme: Gain 5 Regen |
| `draintouch` | Drain Touch+ | 1 | Deal 7 dmg. Extreme: Deal 7 dmg + heal 8 HP |
| `nightveil` | Night Veil+ | 1 | Gain 9 Block. Extreme: Gain 9 Block + 3 Regen |
| `darkblood` | Dark Blood+ | 0 | Lose 2 HP. Draw 3 cards |
| `swoopdown` | Swoop Down+ | 1 | Gain Fly + 6 Block. Extreme: Fly + 6 Block + draw 1 |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `sanguinestrike` | Sanguine Strike+ | 1 | Deal 10 dmg + 2 Regen. Extreme: Deal 13 dmg + 4 Regen |
| `crimsonpact` | Crimson Pact+ | 1 | Lose 4 HP. Gain 4 Regen + draw 2. Extreme: Lose 2 HP + 6 Regen |
| `bloodbank` | Blood Bank+ | 1 | Convert 8 HP into 13 Block. Extreme: Convert 6 HP into 18 Block |
| `drainlife` | Drain Life+ | 2 | Deal 15 dmg. Heal full damage dealt. Extreme: Deal 20 dmg |
| `batform` | Bat Form+ | 1 | Gain Fly + draw 2. Extreme: Fly + draw 2 + 3 Regen |
| `shadowfeast` | Shadow Feast+ | 1 | Deal 8 dmg. If Regen active: deal 13. Extreme: deal 10/18 |
| `darkrite` | Dark Rite+ | 1 | Lose 6 HP. Gain 16 Block + 3 Regen. Extreme: Lose 4 HP + 20 Block + 4 Regen |
| `bloodrush` | Blood Rush+ | 0 | Spend 3 HP. Next attack +9 dmg. Extreme: Spend 2 HP + 12 dmg |
| `nightstalk` | Night Stalk+ | 1 | Deal 7 dmg twice. Extreme: Deal 9 dmg twice + 3 Regen |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect | Design Note |
|---|---|---|---|---|---|
| `bloodlord` | Blood Lord+ | Power | 2 | Exhaust. Heal 3 HP once per Attack card played | NOT per hit — multi-hit cards only heal once |
| `eternalhunger` | Eternal Hunger+ | Power | 2 | Exhaust. Each Regen tick deals 2 dmg to enemy (max 15 per turn) | Capped to prevent passive win |
| `vampiricform` | Vampiric Form+ | Power | 1 | Exhaust. Fly on extreme rolls + gain 2 Regen on Fly | Free vs base cost 2 |
| `darkascension` | Dark Ascension+ | Skill | 2 | Lose 12 HP. Gain 25 Block + 6 Regen. Extreme: Lose 8 HP + 34 Block + 9 Regen | — |
| `soulrend` | Soul Rend+ | Attack | 2 | Deal 20 dmg. Heal equal to damage dealt. Extreme: Deal 28 dmg | — |
| `bloodtide` | Blood Tide+ | Skill | 0 | Exhaust. Triple Regen stacks (max 15). Extreme: Triple + heal 8 HP | Max 15 stacks enforced |

---

## 🎲 GAMBLER UPGRADES

### 🟢 Commons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `strike` | Strike+ | 1 | Deal 9 dmg |
| `defend` | Defend+ | 1 | Gain 8 Block |
| `highorlow` | High or Low+ | 1 | Roll 4-6: deal 18. Roll 2-3: deal 5 |
| `doubldown` | Double Down+ | 0 | Flip: triple roll or keep current |
| `luckystrike` | Lucky Strike+ | 2 | Deal 12 dmg. On max roll: deal 28 |
| `hedgebet` | Hedge Bet+ | 1 | Gain Block equal to roll × 2 |
| `wildcard` | Wild Card+ | 1 | Deal damage equal to roll × 3 |
| `longshot` | Long Shot+ | 1 | Roll 4-6: deal 13. Roll 2-3: deal 6. Max: deal 20 |
| `safepull` | Safe Pull+ | 1 | Gain 6 Block. Set die to 5. Max: Gain 8 Block + set to max |
| `risktaker` | Risk Taker+ | 0 | Reroll die. Draw 2. Max: Reroll + draw 2 + 5 Block |
| `oddscheck` | Odds Check+ | 0 | Draw 2. If roll 4+: draw 3. Max: draw 3 + 8 Gold. Free |
| `chipsin` | Chips In+ | 0 | Gain 8 Gold. Max: Gain 8 Gold + draw 1. Free |

### 🔵 Uncommons

| Key | Name | Cost | Upgrade Effect |
|---|---|---|---|
| `allin` | All In+ | 2 | Deal dmg equal to roll × 5. Max: roll × 7 |
| `loadeddie` | Loaded Die+ | 1 | Set die to any value 4-6. Max: any value 4-max |
| `pocketaces` | Pocket Aces+ | 1 | Next attack deals +(roll × 2) dmg. Max: +(roll × 3) dmg |
| `doubleornothing` | Double or Nothing+ | 1 | Deal 8 dmg. 50/50: deal 18 or take 4. Max: deal 24 or take 2 |
| `counttheodds` | Count the Odds+ | 0 | Look at top 3 cards. Keep 2 discard 1. Max: look at 4, keep 3 |
| `highstakes` | High Stakes+ | 1 | Gain Gold equal to roll × 4. Max: roll × 7 |
| `bluff` | Bluff+ | 1 | Apply Weak 2 + Vulnerable 1. Max: Weak 3 + Vulnerable 2 |

### 🟣 Rares

| Key | Name | Type | Cost | Upgrade Effect | Design Note |
|---|---|---|---|---|---|
| `houseedge` | House Edge+ | Power | 1 | Exhaust. Min die roll raised to 4 this combat | Base raises to 3 |
| `luckystreak` | Lucky Streak+ | Power | 1 | Exhaust. Each max roll draws 1 card + deals 6 dmg | Base deals 4 dmg |
| `gamblersfallacy` | Gambler's Fallacy+ | Power | 1 | Exhaust. After 2 non-max rolls, next roll guaranteed max | Base threshold is 3 |
| `bettingitall` | Betting It All+ | Attack | 3 | Deal dmg = Gold ÷ 4 (max 45). Exhaust. Max roll: Gold ÷ 3 (max 60) | — |
| `loadedhouse` | Loaded House+ | Skill | 1 | Exhaust. Next 2 dice rolls are max. Max roll: next 3 | Toned down from 3-4 — run-defining otherwise |
| `devilsdeal` | Devil's Deal+ | Skill | 1 | Gain 3 Energy. Lose Gold = roll × 6 (min 1 Gold) | Min cost 1 must be enforced |

---

## 🃏 SHARED POOL UPGRADES

| Key | Name | Type | Cost | Base Effect | Upgrade Effect |
|---|---|---|---|---|---|
| `ragefuel` | Rage Fuel+ | Power | 1 | Exhaust. Gain 1 Strength this combat | Exhaust. Gain 2 Strength this combat |
| `blizzard` | Blizzard+ | Attack | 2 | Deal 5 dmg 3 times | Deal 8 dmg 3 times |
| `stealheal` | Steal & Heal+ | Attack | 2 | Deal 10 dmg. Heal 5 HP | Deal 14 dmg. Heal 9 HP |
| `curseddice` | Cursed Die+ | Skill | 0 | Reroll die. Take 3 damage | Reroll die. Take 1 damage |
| `ironwall` | Iron Wall+ | Skill | 2 | Gain 14 Block | Gain 20 Block |
| `soulsteal` | Soul Steal+ | Attack | 1 | Deal 7 dmg. Gain 1 Soul | Deal 10 dmg. Gain 2 Souls |

---

## BALANCE NOTES

**Barbarian:** Entrench + Berserker's Oath sustain loop is intentional. Death Rattle requires reliable self-damage access — Blood Price is the safety valve. Warlord's Presence uses Rage status internally — +2/+3 Strength = same thing.

**Mage:** Spell Echo + Frozen Inferno is the big combo. Cost 1 for Echo keeps it accessible. Arcane Momentum lasts whole combat — resets +3 cap each turn, doesn't stack infinitely. Cold Mastery+ at 50% makes Chill a serious defensive tool.

**Thief:** Shadow Artist+ changed from free cards to cost reduction — prevents full hand dumps every turn. Death Mark+ capped at 20 stacks — 10 stacks × triple = 30 was too explosive. Blade Dance + Lethal Rhythm + Poison Master is the intended combo cap.

**Vampire:** Blood Lord changed to once-per-card to prevent Blade Dance infinite sustain. Eternal Hunger capped at 15/turn to prevent passive win condition. Blood Tide max 15 Regen stacks — works with Eternal Hunger for burst windows.

**Gambler:** Loaded House+ toned to 2-3 rolls (was 3-4) — guaranteed perfect turns felt run-defining. Lucky Streak+ deals 6 dmg vs base 4 — tracks via status stack count. Gambler's Fallacy+ threshold 2 vs base 3 — meaningful upgrade without being overpowered.