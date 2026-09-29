// Hero content. Portraits load from the reference build's asset folder by path. The
// `*_original.*` files are byte-identical to the base64 images embedded in ../js/data.js.
//
// A hero declares no die size: every hero starts on STARTING_DIE (content/dice.js) and the
// equipped die is run state from step 3c onwards. `minRoll` is the hero's own roll floor (the
// Gambler never rolls a 1) and is combined with the equipped die's floor at fight start.

const ASSETS = '../assets/';

export const HEROES = {
  barbarian: {
    name: 'Barbarian', emoji: '🪓', color: '#8b1a1a',
    hp: 90, affinity: 'even',
    blurb: 'Raw aggression. Hits harder on even rolls.',
    portrait: ASSETS + 'barb_hero_original.png',
    starterDeck: ['strike', 'strike', 'strike', 'defend', 'defend', 'heavyblow', 'heavyblow', 'warshout', 'warshout', 'ironbash'],
    available: true,
  },
  mage: {
    name: 'Mage', emoji: '🔮', color: '#1a237e', hp: 70, affinity: 'high',
    blurb: 'Spells unleash full power on high rolls.',
    portrait: ASSETS + 'mage_hero.png', available: true,
    starterDeck: ['strike', 'strike', 'defend', 'defend', 'frostbolt', 'frostbolt', 'arcanebarrier', 'manasurge', 'arcaneboost', 'voidchannel'],
  },
  thief: {
    name: 'Thief', emoji: '🗡️', color: '#1b5e20', hp: 75, affinity: 'odd',
    blurb: 'Fast combos triggered by odd rolls.',
    portrait: ASSETS + 'thief_hero.png', available: true,
    starterDeck: ['strike', 'strike', 'defend', 'defend', 'quickstrike', 'quickstrike', 'shadowstep', 'poisonblade', 'pickpocket', 'smokescreen'],
  },
  vampire: {
    name: 'Vampire', emoji: '🧛', color: '#880e4f', hp: 78, affinity: 'extreme',
    blurb: 'Feast or famine. Lifesteal on extreme rolls.',
    portrait: ASSETS + 'vampire_hero_original.jpg', available: true,
    starterDeck: ['strike', 'strike', 'defend', 'defend', 'blooddrain', 'blooddrain', 'nightshroud', 'lifeleech', 'crimsonbite', 'darkembrace'],
  },
  gambler: {
    // Gambler cards read the raw die; their bonus clauses trigger on a max roll ("Max").
    // Passive (decision D5): once per turn, a max roll grants a bonus reroll.
    name: 'Gambler', emoji: '🎲', color: '#b8860b', hp: 72, affinity: 'max', minRoll: 2,
    maxRollReroll: true,
    blurb: 'Dice manipulation master. Never rolls a 1; a max roll grants a bonus reroll.',
    portrait: ASSETS + 'gambler_hero_original.png', available: true,
    starterDeck: ['strike', 'strike', 'defend', 'defend', 'highorlow', 'highorlow', 'doubldown', 'luckystrike', 'hedgebet', 'wildcard'],
  },
};

export const FLOOR_BACKGROUNDS = {
  1: ASSETS + 'floor1.png',
};
