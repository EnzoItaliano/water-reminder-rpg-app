export const MONSTER_IMAGES = {
    sand_slime: {
        1: require('../../assets/icons/sand_slime/level_1.png'),
        2: require('../../assets/icons/sand_slime/level_1.png'), // Mapped to 1 if missing or same
        3: require('../../assets/icons/sand_slime/level_2.png'),
        4: require('../../assets/icons/sand_slime/level_2.png'),
        5: require('../../assets/icons/sand_slime/level_3.png'),
        6: require('../../assets/icons/sand_slime/level_3.png'),
        7: require('../../assets/icons/sand_slime/level_4.png'),
        8: require('../../assets/icons/sand_slime/level_4.png'),
        9: require('../../assets/icons/sand_slime/level_6.png'),
        10: require('../../assets/icons/sand_slime/level_6.png'),
    },
    cactus_golem: {
        1: require('../../assets/icons/cactus_golem/level_1.png'),
        3: require('../../assets/icons/cactus_golem/level_2.png'),
        5: require('../../assets/icons/cactus_golem/level_3.png'),
        7: require('../../assets/icons/cactus_golem/level_4.png'),
        9: require('../../assets/icons/cactus_golem/level_6.png'),
    },
    dust_phoenix: {
        1: require('../../assets/icons/dust_phoenix/level_1.png'),
        3: require('../../assets/icons/dust_phoenix/level_2.png'),
        5: require('../../assets/icons/dust_phoenix/level_3.png'),
        7: require('../../assets/icons/dust_phoenix/level_4.png'),
        9: require('../../assets/icons/dust_phoenix/level_6.png'),
    },
    drought_king: {
        1: require('../../assets/icons/drought_king/level_1.png'),
        3: require('../../assets/icons/drought_king/level_2.png'),
        5: require('../../assets/icons/drought_king/level_3.png'),
        7: require('../../assets/icons/drought_king/level_4.png'),
        9: require('../../assets/icons/drought_king/level_6.png'),
    },
    drought_bat: {
        1: require('../../assets/icons/drought_bat/level_1.png'),
        3: require('../../assets/icons/drought_bat/level_2.png'),
        5: require('../../assets/icons/drought_bat/level_3.png'),
        7: require('../../assets/icons/drought_bat/level_4.png'),
        9: require('../../assets/icons/drought_bat/level_6.png'),
    },
    dust_mite: {
        1: require('../../assets/icons/dust_mite/level_1.png'),
        3: require('../../assets/icons/dust_mite/level_2.png'),
        5: require('../../assets/icons/dust_mite/level_3.png'),
        7: require('../../assets/icons/dust_mite/level_4.png'),
        9: require('../../assets/icons/dust_mite/level_6.png'),
    },
    mirage_mimic: {
        1: require('../../assets/icons/mirage_mimic/level_1.png'),
        3: require('../../assets/icons/mirage_mimic/level_2.png'),
        5: require('../../assets/icons/mirage_mimic/level_3.png'),
        7: require('../../assets/icons/mirage_mimic/level_4.png'),
        9: require('../../assets/icons/mirage_mimic/level_6.png'),
    },
    salt_spider: {
        1: require('../../assets/icons/salt_spider/level_1.png'),
        3: require('../../assets/icons/salt_spider/level_2.png'),
        5: require('../../assets/icons/salt_spider/level_3.png'),
        7: require('../../assets/icons/salt_spider/level_4.png'),
        9: require('../../assets/icons/salt_spider/level_6.png'),
    },
    searing_serpent: {
        1: require('../../assets/icons/searing_serpent/level_1.png'),
        3: require('../../assets/icons/searing_serpent/level_2.png'),
        5: require('../../assets/icons/searing_serpent/level_3.png'),
        7: require('../../assets/icons/searing_serpent/level_4.png'),
        9: require('../../assets/icons/searing_serpent/level_6.png'),
    },
    "sun-baked_skull": {
        1: require('../../assets/icons/sun-baked_skull/level_1.png'),
        3: require('../../assets/icons/sun-baked_skull/level_2.png'),
        5: require('../../assets/icons/sun-baked_skull/level_3.png'),
        7: require('../../assets/icons/sun-baked_skull/level_4.png'),
        9: require('../../assets/icons/sun-baked_skull/level_6.png'),
    }
};

export const getMonsterImage = (id, difficulty) => {
    const levels = MONSTER_IMAGES[id];
    if (!levels) return null; // Fallback?

    // Logic from UI.js:
    // 1-2 -> level 1
    // 3-4 -> level 2
    // 5-6 -> level 3
    // 7-8 -> level 4
    // 9-10 -> level 6 (named level 6 in files)

    let levelKey = 1;
    if (difficulty >= 3) levelKey = 3;
    if (difficulty >= 5) levelKey = 5;
    if (difficulty >= 7) levelKey = 7;
    if (difficulty >= 9) levelKey = 9;

    return levels[levelKey] || levels[1];
};
