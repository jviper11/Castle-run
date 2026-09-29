// Card reward pools, bucketed by rarity. Copied from the reference build's CHAR_REWARD_POOLS
// (js/ui.js).

export const REWARD_POOLS = {
  barbarian: {
    common: ['brutalswing', 'shieldbreaker', 'warcry', 'toughhide', 'bloodprice', 'heavyblow', 'warshout', 'ironbash'],
    uncommon: ['haymaker', 'skullcrack', 'recklesslunge', 'battlecry', 'ironroar', 'bloodlust', 'entrench',
      'overpowerattack', 'crushingblow', 'warcallecho', 'soulsteal', 'stealheal', 'ironwall', 'curseddice'],
    rare: ['ragefuel', 'berserkersoath', 'warlordspresence', 'deathrattle', 'laststand', 'battletrance'],
  },
  thief: {
    common: ['swiftjab', 'slipaway', 'cheapshot', 'coinflick', 'nimblepace', 'quickstrike', 'shadowstep', 'poisonblade', 'pickpocket', 'smokescreen'],
    uncommon: ['envenomdagger', 'backstab', 'cripple', 'shadowmark', 'poisoncloud', 'bladedance', 'disappear', 'concoction',
      'thiefsgambit', 'gutpunch', 'soulsteal', 'stealheal', 'curseddice'],
    rare: ['deathmark', 'shadowartist', 'poisonmaster', 'lethalrhythm', 'assassinate', 'goldenstrike'],
  },
  vampire: {
    common: ['bloodpulse', 'draintouch', 'nightveil', 'darkblood', 'swoopdown', 'blooddrain', 'nightshroud', 'lifeleech', 'crimsonbite', 'darkembrace'],
    uncommon: ['sanguinestrike', 'crimsonpact', 'bloodbank', 'drainlife', 'batform', 'shadowfeast', 'darkrite', 'bloodrush',
      'nightstalk', 'cursedveins', 'ironwall', 'soulsteal', 'stealheal', 'curseddice'],
    rare: ['bloodlord', 'eternalhunger', 'vampiricform', 'darkascension', 'soulrend', 'bloodtide'],
  },
  mage: {
    common: ['spark', 'flametouch', 'meditate', 'channelfocus', 'frostbolt', 'arcanebarrier', 'manasurge', 'arcaneboost',
      'voidchannel', 'fireball', 'blizzard'],
    uncommon: ['icelance', 'combustion', 'chainbolt', 'ignite', 'arcanerecall', 'manaweave', 'frostfire', 'arcanebarrage',
      'arcanesight', 'arcanemomentum', 'soulsteal', 'ironwall', 'curseddice'],
    rare: ['frozeninferno', 'inferno', 'timewarp', 'spellecho', 'coldmastery', 'burningsoul'],
  },
  gambler: {
    common: ['longshot', 'safepull', 'risktaker', 'oddscheck', 'chipsin', 'highorlow', 'doubldown', 'luckystrike', 'hedgebet', 'wildcard'],
    uncommon: ['allin', 'loadeddie', 'pocketaces', 'doubleornothing', 'counttheodds', 'highstakes', 'bluff', 'wildcardcombo',
      'pressyourluck', 'jackpot', 'soulsteal', 'stealheal', 'curseddice'],
    rare: ['houseedge', 'luckystreak', 'gamblersfallacy', 'bettingitall', 'loadedhouse', 'devilsdeal'],
  },
};

// Reward odds from the reference build's showReward(). The rare pity (+1% per non-rare normal
// reward, max +30) applies to normal fights only.
export const REWARD_ODDS = {
  normal: { rare: 5, uncommon: 25 },
  elite: { rare: 10, uncommon: 35 },
  pityCap: 30,
  choices: 3,
  skipGold: 10,
};
