(() => {
  const G = window.G = window.G || {};

  const DICT = {
    en: {
      title: 'Deeper! Idle Drill',
      loading: 'Loading…',
      m: 'm', perSec: '/s',
      'layer.soil': 'Soil', 'layer.clay': 'Clay', 'layer.stone': 'Stone', 'layer.granite': 'Granite', 'layer.basalt': 'Basalt',
      'layer.quartz': 'Quartz', 'layer.gems': 'Gems', 'layer.mantle': 'Mantle', 'layer.outer': 'Outer Core', 'layer.core': 'Core',
      'planet.earth': 'Earth', 'planet.mars': 'Mars', 'planet.ice': 'Ice Moon', 'planet.volcanis': 'Volcanis', 'planet.crystallia': 'Crystallia',
      'planet.n': 'Planet {n}',
      'up.drill': 'Drill Bit', 'up.engine': 'Engine', 'up.sorter': 'Sorter', 'up.grip': 'Grip', 'up.storage': 'Storage',
      'eff.drill': 'Power {v}', 'eff.engine': 'Power ×{v}', 'eff.sorter': 'Income ×{v}', 'eff.grip': 'Tap ×{v}', 'eff.storage': 'Offline {v} h',
      lv: 'Lv {n}', toX3: 'to ×3: {n} lv', maxed: 'MAX', buyMax: 'MAX',
      'tab.up': 'Upgrades', 'tab.planet': 'Planet', 'tab.shop': 'Shop', 'tab.settings': 'Settings',
      turbo: 'Turbo', 'turbo.desc': 'Power ×2: double speed and double income. Runs only while you play.',
      'turbo.ad': 'Ad: Turbo 5 min', 'turbo.gems': 'Turbo 30 min', 'turbo.left': 'Turbo left: {t}', 'turbo.full': 'Turbo stock is full (60 min max)',
      'ad.fail': 'Ad unavailable, try later', 'ads.off': 'Video ads are unavailable right now, so ad bonuses are hidden.',
      'plate.title': 'Plate', 'plate.auto': 'The drill will break it in {n} s', 'plate.need': 'Tap faster or boost power to {x}',
      newLayer: 'New layer: {name}!',
      'core.btn': 'Blow up the core', 'core.hint': 'You reached the core! Blow it up and fly to the next planet.',
      'core.title': 'Blow up the core?',
      'core.text': 'You will get {n} core shards. Each shard permanently gives +10% power and income. Coins and coin upgrades will reset.',
      'core.go': 'Blow it up!', later: 'Later', 'core.need': 'Reach {d} m to blow up the core',
      'arrive.title': 'Welcome to {name}!', 'arrive.text': 'Core shards: {s} · +{b}% power and income', 'arrive.go': 'Dig!',
      'off.title': 'While you were away ({t})', 'off.collect': 'Collect', 'off.ad': 'Ad: collect ×2', 'off.layer': 'New layer: {name}',
      'off.core': 'The drill reached the core!',
      'cart.title': 'Treasure cart!', 'cart.text': 'A cart full of ore rolled by. Grab the loot!', 'cart.free': 'Collect', 'cart.ad': 'Ad: 5 min of income',
      'daily.title': 'Daily reward', 'daily.day': 'Day {n}', 'daily.claim': 'Claim', 'daily.ad': 'Ad: claim ×2', 'daily.next': 'Next reward in {t}',
      'rw.income': '{n} min income', 'rw.turbo': 'Turbo {n} min',
      'geode.title': 'Geode', 'geode.desc': 'Ripens in 8 hours. Inside: 30 min of income and 5 gems.',
      'geode.ready': 'The geode is ready!', 'geode.open': 'Crack it open', 'geode.ad': 'Ad: −1 hour', 'geode.gems': '−1 hour',
      'geode.skips': 'Speed-ups left: {n}',
      'tasks.title': 'Daily tasks', 'tasks.claim': 'Claim', 'tasks.chest': 'Bonus chest for all three', 'tasks.reset': 'New tasks in {t}',
      'task.plates': 'Break {n} plates', 'task.taps': 'Tap {n} times', 'task.drillLv': 'Buy {n} Drill Bit levels', 'task.carts': 'Catch {n} carts',
      'task.layers': 'Pass {n} layers', 'task.turbo': 'Activate Turbo', 'task.upgrades': 'Buy any upgrade {n} times',
      'vein.banner': 'Golden vein today: {name} ×3', 'weekend.banner': 'Miner\'s weekend! Plate gems ×2, carts more often', 'weekend.soon': 'Tomorrow: Miner\'s weekend!',
      'ach.title': 'Achievements', 'ach.toast': 'Achievement: {name}',
      'ach.depth_100': 'Reach 100 m', 'ach.depth_1k': 'Reach 1,000 m', 'ach.depth_5k': 'Reach 5,000 m', 'ach.first_core': 'Blow up a core',
      'ach.planet_3': 'Reach planet 3', 'ach.planet_5': 'Reach planet 5', 'ach.taps_1k': '1,000 taps', 'ach.taps_10k': '10,000 taps',
      'ach.drill_100': 'Drill Bit level 100', 'ach.plates_25': 'Break 25 plates', 'ach.cart_10': 'Catch 10 carts', 'ach.offline_8h': 'Earn 8+ hours offline',
      'shop.turbo': 'Turbo', 'shop.instant': '2 hours of income', 'shop.instantDesc': 'Get {n} coins right now',
      'shop.skins': 'Drill skins', 'shop.equip': 'Equip', 'shop.equipped': 'Equipped', 'shop.gems': 'Gems come from plates, treasures, quests, goals, geodes, daily rewards and achievements',
      'skin.classic': 'Classic', 'skin.rocket': 'Rocket', 'skin.dragon': 'Dragon', 'skin.gold': 'Golden', 'skin.neon': 'Neon', 'skin.unicorn': 'Unicorn Drill',
      'pl.shards': 'Core shards: {n}', 'pl.bonus': '+{n}% power and income', 'pl.record': 'Total depth: {n} m', 'pl.layers': 'Planet layers',
      'pl.vein': 'Golden vein', 'pl.here': 'You are here',
      settings: 'Settings', sound: 'Sound', music: 'Music', vibro: 'Vibration', shake: 'Screen shake', lang: 'Language',
      notation: 'Numbers', 'login.btn': 'Sign in with CrazyGames', 'login.desc': 'Keep your progress on every device. First sign-in: +5 gems.',
      'login.as': 'Signed in as {name}', 'login.gift': 'Thanks for signing in! +5 gems',
      paused: 'Paused', resume: 'Resume', 'pause.keys': 'Space / click — tap · P — pause',
      'tut.tap': 'Tap to dig faster!', 'tut.upgrade': 'Upgrade your drill!', 'tut.plate': 'A plate! Tap it or boost your power',
      'tut.engine': 'The Engine multiplies power. Try it!', 'tut.cart': 'Catch the cart!', 'tut.skip': 'Skip',
      'goal.label': 'Next goal', 'goal.layer': 'To {name}: {a} / {b} m', 'goal.core': 'To the core: {a} / {b} m',
      'goal.upgrade': '{name}: {a} / {b}', 'goal.skin': 'Skin «{name}»: {a} / {b}', 'goal.geode': 'Geode opens in {t}',
      'goal.tasks': 'Daily tasks: {a} / {b}', 'goal.ach': '{name}: {a} / {b}',
      thanks: 'Got it!', 'got.gems': '+{n} gems', 'got.coins': '+{n} coins', 'got.turbo': 'Turbo +{n} min', 'no.gems': 'Not enough gems',
      close: 'Close', 'time.h': '{h} h {m} min', 'time.m': '{m} min {s} s', 'time.s': '{s} s', 'eta': '≈ {t}',
      'od.on': 'OVERDRIVE! Power ×3', 'tut.node': 'Treasure! Tap it before it slips away', 'tut.heat': 'Tap fast to fill the heat bar: Overdrive ×3!',
      'relic.title': 'Relics', 'relic.toast': 'Relic found: {name}! +5% income forever', 'relic.bonus': 'Found {a} / {b} · +{n}% income',
      'relic.locked': 'Planet {p}+', 'relic.hint': 'Relics hide in treasures. Each one gives +5% income forever.',
      'relic.0': 'Ammonite', 'relic.1': 'Trilobite', 'relic.2': 'Raptor Skull', 'relic.3': 'Stone Fern', 'relic.4': 'Amber Bug', 'relic.5': 'Mammoth Tusk',
      'relic.6': 'Alien Egg', 'relic.7': 'Frozen Heart', 'relic.8': 'Lava Pearl', 'relic.9': 'Star Shard', 'relic.10': 'Ancient Coin', 'relic.11': 'Golden Idol',
      'tip.drill': 'Base power +1 per level, and every 25th level multiplies power ×3. Power sets digging speed and plate damage.',
      'tip.engine': 'Multiplies power by 1 + 0.25 per level: faster digging and stronger plate damage.',
      'tip.sorter': 'Multiplies coins per meter by 1 + 0.2 per level. Speed stays the same, every meter pays more.',
      'tip.grip': 'Each tap is 10% stronger per level: more meters, coins and plate damage per tap.',
      'tip.storage': 'Offline earning limit: 2 h + 1 h per level (max 12 h). Paid with gems, never resets.',
      'tip.now': 'Now', 'tip.next': 'Next', 'tip.look': 'Lv {lv}: {name}', 'tip.lookMax': 'Final look reached',
      'look.drill.1': 'toothed head', 'look.drill.2': 'carbide head', 'look.drill.3': 'titanium head', 'look.drill.4': 'diamond head', 'look.drill.5': 'plasma head',
      'look.engine.1': 'tall exhausts', 'look.engine.2': 'turbine', 'look.engine.3': 'flame exhausts', 'look.engine.4': 'reactor',
      'look.grip.1': 'clamps', 'look.grip.2': 'arms', 'look.grip.3': 'hydraulics', 'look.grip.4': 'golden claws',
      'look.sorter.1': 'hopper', 'look.sorter.2': 'big hopper', 'look.sorter.3': 'gem sorter', 'look.sorter.4': 'golden sorter',
      'look.storage.1': 'crate', 'look.storage.2': 'two crates', 'look.storage.3': 'cargo rack', 'look.storage.4': 'vault',
      'look.up': 'New look: {name}!',
      'tab.goals': 'Goals', 'q.title': 'Quest #{n}', 'q.done': 'Quest complete!',
      'q.drill': 'Buy {n} Drill Bit levels', 'q.node': 'Collect {n} treasures', 'q.tap': 'Tap {n} times', 'q.upgrade': 'Buy {n} upgrades',
      'q.plate': 'Break a plate', 'q.overdrive': 'Trigger Overdrive', 'q.earn': 'Earn {n} coins', 'q.depth': 'Reach {n} m',
      'q.enemy': 'Defeat an underground pest', 'q.cart': 'Catch a treasure cart',
      'goals.micro': 'Current quest', 'goals.macro': 'Big goals', 'goals.daily': 'Daily tasks', 'goals.reward': 'Reward',
      'm.depth': 'Total depth {n} m', 'm.cores': 'Blow up {n} cores', 'm.drill': 'Drill Bit level {n}', 'm.relics': 'Find {n} relics',
      'm.enemies': 'Defeat {n} pests', 'm.treasures': 'Collect {n} treasures', 'm.skins': 'Own {n} drill skins', 'm.quests': 'Complete {n} quests',
      'm.stage': 'Stage {a}/{b}', 'm.claim': 'Claim', 'm.done': 'All stages done!',
      'perk.title': 'Core perks', 'perk.unlock': 'Planet {p}', 'perk.new': 'New perk: {name}',
      'perk.cart': 'Carts come 25% more often', 'perk.start10': 'New planets start with Drill Bit lv 10', 'perk.heat': 'Heat bar fills 30% faster',
      'perk.crit': 'Crit chance 12% → 20%', 'perk.engine5': 'New planets start with Engine lv 5', 'perk.nodes': 'Treasures appear 30% more often',
      'perk.over': 'Overdrive lasts 12 s', 'perk.plate': 'Taps deal +50% plate damage', 'perk.offline': 'Offline power 50% → 75%',
      'perk.start25': 'New planets start with Drill Bit lv 25',
      'pre.mul': 'Power and income', 'pre.planet': 'Planet', 'pre.start': 'Start Drill Bit', 'pre.shards': 'Core shards', 'pre.lose': 'Resets: coins and coin upgrades',
      'pre.run': 'This planet took {t}', 'arrive.perk': 'Perk unlocked: {name}', 'arrive.run': 'Planet {p} done in {t}', 'arrive.best': 'record!',
      'en.mole': 'Mole thief! Tap it to get your coins back!', 'en.spider': 'A crystal spider webbed the drill! Tap it!',
      'en.slime': 'Magma slime jammed the drill! Tap it off!', 'en.cavein': 'Cave-in! Rocks jammed the drill. Tap them!',
      'en.gone.mole': 'The mole escaped with {n} coins', 'en.gone.other': 'The drill broke free by itself', 'en.win': 'Pest defeated! +{n} coins',
      'pet.title': 'Companions', 'pet.hint': 'Helpers live in the shaft and work while the game is open. They are never reset.',
      'pet.bot': 'Drill Bot', 'pet.bot.d': 'Taps the drill for you: {n} taps/s',
      'pet.bat': 'Magnet Bat', 'pet.bat.d': 'Grabs a treasure every {n} s',
      'pet.golem': 'Rock Golem', 'pet.golem.d': 'Punches pests every {n} s',
      'pet.hire': 'Hire', 'pet.lv': 'Lv {n}/{m}', 'pet.next': 'Next level: {v}',
      'lab.title': 'Crystal Lab', 'lab.hint': 'Permanent upgrades. They stay after every core blast.',
      'lab.crit': 'Sharp Edge', 'lab.crit.d': 'Crit power ×{a} → ×{b}',
      'lab.luck': 'Lucky Pick', 'lab.luck.d': 'Treasure coins +{a}% → +{b}%',
      'lab.heat': 'Heat Sink', 'lab.heat.d': 'Overdrive {a} s → {b} s',
      'lab.plate': 'Plate Breaker', 'lab.plate.d': 'Plate damage +{a}% → +{b}%',
      'lab.turbo': 'Turbo Coil', 'lab.turbo.d': 'Turbo power ×{a} → ×{b}',
      'forge.title': 'Shard Forge', 'forge.d': 'Fuse gems into a core shard: +10% power and income forever. No limit, the price grows.',
      'forge.buy': '+1 shard', 'forge.count': 'Forged: {n} · now +{b}%',
      'pet.got': '{name} joined you!', 'lab.got': '{name} upgraded!', 'forge.got': 'Core shard forged! +10%',
    },
    ru: {
      title: 'Глубже! Бур до ядра',
      loading: 'Загрузка…',
      m: 'м', perSec: '/с',
      'layer.soil': 'Почва', 'layer.clay': 'Глина', 'layer.stone': 'Камень', 'layer.granite': 'Гранит', 'layer.basalt': 'Базальт',
      'layer.quartz': 'Кварц', 'layer.gems': 'Самоцветы', 'layer.mantle': 'Мантия', 'layer.outer': 'Внешнее ядро', 'layer.core': 'Ядро',
      'planet.earth': 'Земля', 'planet.mars': 'Марс', 'planet.ice': 'Ледяная луна', 'planet.volcanis': 'Вулканис', 'planet.crystallia': 'Кристаллия',
      'planet.n': 'Планета {n}',
      'up.drill': 'Бур', 'up.engine': 'Двигатель', 'up.sorter': 'Сортировщик', 'up.grip': 'Хватка', 'up.storage': 'Склад',
      'eff.drill': 'Мощность {v}', 'eff.engine': 'Мощность ×{v}', 'eff.sorter': 'Доход ×{v}', 'eff.grip': 'Тап ×{v}', 'eff.storage': 'Офлайн {v} ч',
      lv: 'ур. {n}', toX3: 'до ×3: {n} ур.', maxed: 'МАКС', buyMax: 'МАКС',
      'tab.up': 'Улучшения', 'tab.planet': 'Планета', 'tab.shop': 'Магазин', 'tab.settings': 'Настройки',
      turbo: 'Турбо', 'turbo.desc': 'Мощность ×2: скорость и доход удваиваются. Тратится, только пока ты в игре.',
      'turbo.ad': 'Реклама: Турбо 5 мин', 'turbo.gems': 'Турбо 30 мин', 'turbo.left': 'Осталось Турбо: {t}', 'turbo.full': 'Запас Турбо полон (максимум 60 мин)',
      'ad.fail': 'Реклама недоступна, попробуй позже', 'ads.off': 'Видеореклама сейчас недоступна, поэтому бонусы за рекламу скрыты.',
      'plate.title': 'Плита', 'plate.auto': 'Бур пробьёт сам через {n} с', 'plate.need': 'Тапай быстрее или прокачай мощность до {x}',
      newLayer: 'Новый слой: {name}!',
      'core.btn': 'Взорвать ядро', 'core.hint': 'Ты добрался до ядра! Взорви его и лети на следующую планету.',
      'core.title': 'Взорвать ядро?',
      'core.text': 'Получишь осколков ядра: {n}. Каждый осколок навсегда даёт +10% к мощности и доходу. Монеты и улучшения за монеты обнулятся.',
      'core.go': 'Взорвать!', later: 'Позже', 'core.need': 'Докопай до {d} м, чтобы взорвать ядро',
      'arrive.title': 'Добро пожаловать: {name}!', 'arrive.text': 'Осколков ядра: {s} · +{b}% к мощности и доходу', 'arrive.go': 'Копать!',
      'off.title': 'Пока тебя не было ({t})', 'off.collect': 'Забрать', 'off.ad': 'Реклама: забрать ×2', 'off.layer': 'Новый слой: {name}',
      'off.core': 'Бур дошёл до ядра!',
      'cart.title': 'Тележка с сокровищами!', 'cart.text': 'Мимо проехала тележка с рудой. Забирай добычу!', 'cart.free': 'Забрать', 'cart.ad': 'Реклама: 5 мин дохода',
      'daily.title': 'Ежедневная награда', 'daily.day': 'День {n}', 'daily.claim': 'Забрать', 'daily.ad': 'Реклама: забрать ×2', 'daily.next': 'Следующая награда через {t}',
      'rw.income': '{n} мин дохода', 'rw.turbo': 'Турбо {n} мин',
      'geode.title': 'Жеода', 'geode.desc': 'Созревает 8 часов. Внутри: 30 минут дохода и 5 кристаллов.',
      'geode.ready': 'Жеода созрела!', 'geode.open': 'Расколоть', 'geode.ad': 'Реклама: −1 час', 'geode.gems': '−1 час',
      'geode.skips': 'Ускорений осталось: {n}',
      'tasks.title': 'Задания дня', 'tasks.claim': 'Забрать', 'tasks.chest': 'Бонусный сундук за все три', 'tasks.reset': 'Новые задания через {t}',
      'task.plates': 'Разбей плит: {n}', 'task.taps': 'Сделай тапов: {n}', 'task.drillLv': 'Купи уровней Бура: {n}', 'task.carts': 'Поймай тележек: {n}',
      'task.layers': 'Пройди слоёв: {n}', 'task.turbo': 'Включи Турбо', 'task.upgrades': 'Купи улучшения {n} раз',
      'vein.banner': 'Сегодня золотая жила: {name} ×3', 'weekend.banner': 'Выходные шахтёра! Кристаллы за плиты ×2, тележки чаще', 'weekend.soon': 'Завтра: выходные шахтёра!',
      'ach.title': 'Достижения', 'ach.toast': 'Достижение: {name}',
      'ach.depth_100': 'Глубина 100 м', 'ach.depth_1k': 'Глубина 1 000 м', 'ach.depth_5k': 'Глубина 5 000 м', 'ach.first_core': 'Взорвать ядро',
      'ach.planet_3': 'Дойти до планеты 3', 'ach.planet_5': 'Дойти до планеты 5', 'ach.taps_1k': '1 000 тапов', 'ach.taps_10k': '10 000 тапов',
      'ach.drill_100': 'Бур 100 уровня', 'ach.plates_25': 'Разбить 25 плит', 'ach.cart_10': 'Поймать 10 тележек', 'ach.offline_8h': 'Офлайн-доход за 8+ часов',
      'shop.turbo': 'Турбо', 'shop.instant': '2 часа дохода', 'shop.instantDesc': 'Сразу получить {n} монет',
      'shop.skins': 'Скины бура', 'shop.equip': 'Надеть', 'shop.equipped': 'Надет', 'shop.gems': 'Кристаллы дают плиты, клады, квесты, цели, жеоды, ежедневные награды и достижения',
      'skin.classic': 'Классический', 'skin.rocket': 'Ракета', 'skin.dragon': 'Дракон', 'skin.gold': 'Золотой', 'skin.neon': 'Неоновый', 'skin.unicorn': 'Сверло-единорог',
      'pl.shards': 'Осколки ядра: {n}', 'pl.bonus': '+{n}% к мощности и доходу', 'pl.record': 'Общая глубина: {n} м', 'pl.layers': 'Слои планеты',
      'pl.vein': 'Золотая жила', 'pl.here': 'Ты здесь',
      settings: 'Настройки', sound: 'Звук', music: 'Музыка', vibro: 'Вибрация', shake: 'Тряска экрана', lang: 'Язык',
      notation: 'Числа', 'login.btn': 'Войти через CrazyGames', 'login.desc': 'Прогресс сохранится на всех устройствах. За первый вход: +5 кристаллов.',
      'login.as': 'Ты вошёл как {name}', 'login.gift': 'Спасибо за вход! +5 кристаллов',
      paused: 'Пауза', resume: 'Продолжить', 'pause.keys': 'Пробел / клик — тап · P — пауза',
      'tut.tap': 'Тапай, чтобы копать быстрее!', 'tut.upgrade': 'Улучшай бур!', 'tut.plate': 'Плита! Тапай или прокачай мощность',
      'tut.engine': 'Двигатель умножает мощность. Попробуй!', 'tut.cart': 'Лови тележку!', 'tut.skip': 'Пропустить',
      'goal.label': 'Следующая цель', 'goal.layer': 'До слоя «{name}»: {a} / {b} м', 'goal.core': 'До ядра: {a} / {b} м',
      'goal.upgrade': '{name}: {a} / {b}', 'goal.skin': 'Скин «{name}»: {a} / {b}', 'goal.geode': 'Жеода созреет через {t}',
      'goal.tasks': 'Задания дня: {a} / {b}', 'goal.ach': '{name}: {a} / {b}',
      thanks: 'Отлично!', 'got.gems': '+{n} кристаллов', 'got.coins': '+{n} монет', 'got.turbo': 'Турбо +{n} мин', 'no.gems': 'Не хватает кристаллов',
      close: 'Закрыть', 'time.h': '{h} ч {m} мин', 'time.m': '{m} мин {s} с', 'time.s': '{s} с', 'eta': '≈ {t}',
      'od.on': 'ПЕРЕГРЕВ! Мощность ×3', 'tut.node': 'Клад! Тапни, пока он не уехал', 'tut.heat': 'Тапай быстро, чтобы разогреть бур: Overdrive ×3!',
      'relic.title': 'Реликвии', 'relic.toast': 'Найдена реликвия: {name}! +5% к доходу навсегда', 'relic.bonus': 'Найдено {a} / {b} · +{n}% к доходу',
      'relic.locked': 'Планета {p}+', 'relic.hint': 'Реликвии прячутся в кладах. Каждая навсегда даёт +5% к доходу.',
      'relic.0': 'Аммонит', 'relic.1': 'Трилобит', 'relic.2': 'Череп ящера', 'relic.3': 'Каменный папоротник', 'relic.4': 'Жук в янтаре', 'relic.5': 'Бивень мамонта',
      'relic.6': 'Яйцо пришельца', 'relic.7': 'Ледяное сердце', 'relic.8': 'Лавовая жемчужина', 'relic.9': 'Осколок звезды', 'relic.10': 'Древняя монета', 'relic.11': 'Золотой идол',
      'tip.drill': 'База мощности +1 за уровень, а каждый 25-й уровень умножает мощность ×3. Мощность — это скорость копания и урон по плитам.',
      'tip.engine': 'Умножает мощность на 1 + 0,25 за уровень: быстрее копает и сильнее бьёт плиты.',
      'tip.sorter': 'Умножает монеты за метр на 1 + 0,2 за уровень. Скорость та же, но каждый метр дороже.',
      'tip.grip': 'Каждый тап сильнее на 10% за уровень: больше метров, монет и урона по плите за тап.',
      'tip.storage': 'Лимит офлайн-дохода: 2 ч + 1 ч за уровень (макс. 12 ч). Покупается за кристаллы и не сбрасывается.',
      'tip.now': 'Сейчас', 'tip.next': 'Станет', 'tip.look': 'Ур. {lv}: {name}', 'tip.lookMax': 'Финальный вид получен',
      'look.drill.1': 'зубчатая головка', 'look.drill.2': 'твердосплавная головка', 'look.drill.3': 'титановая головка', 'look.drill.4': 'алмазная головка', 'look.drill.5': 'плазменная головка',
      'look.engine.1': 'высокие выхлопы', 'look.engine.2': 'турбина', 'look.engine.3': 'огненные выхлопы', 'look.engine.4': 'реактор',
      'look.grip.1': 'зажимы', 'look.grip.2': 'манипуляторы', 'look.grip.3': 'гидравлика', 'look.grip.4': 'золотые клешни',
      'look.sorter.1': 'бункер', 'look.sorter.2': 'большой бункер', 'look.sorter.3': 'сортер самоцветов', 'look.sorter.4': 'золотой сортер',
      'look.storage.1': 'ящик', 'look.storage.2': 'два ящика', 'look.storage.3': 'грузовая стойка', 'look.storage.4': 'сейф',
      'look.up': 'Новый вид: {name}!',
      'tab.goals': 'Цели', 'q.title': 'Квест №{n}', 'q.done': 'Квест выполнен!',
      'q.drill': 'Купи уровней Бура: {n}', 'q.node': 'Собери кладов: {n}', 'q.tap': 'Сделай тапов: {n}', 'q.upgrade': 'Купи улучшений: {n}',
      'q.plate': 'Разбей плиту', 'q.overdrive': 'Включи перегрев', 'q.earn': 'Заработай {n} монет', 'q.depth': 'Докопай до {n} м',
      'q.enemy': 'Прогони подземного вредителя', 'q.cart': 'Поймай тележку',
      'goals.micro': 'Текущий квест', 'goals.macro': 'Большие цели', 'goals.daily': 'Задания дня', 'goals.reward': 'Награда',
      'm.depth': 'Общая глубина {n} м', 'm.cores': 'Взорви ядер: {n}', 'm.drill': 'Бур {n} уровня', 'm.relics': 'Найди реликвий: {n}',
      'm.enemies': 'Прогони вредителей: {n}', 'm.treasures': 'Собери кладов: {n}', 'm.skins': 'Собери скинов: {n}', 'm.quests': 'Выполни квестов: {n}',
      'm.stage': 'Этап {a}/{b}', 'm.claim': 'Забрать', 'm.done': 'Все этапы пройдены!',
      'perk.title': 'Перки ядра', 'perk.unlock': 'Планета {p}', 'perk.new': 'Новый перк: {name}',
      'perk.cart': 'Тележки приезжают на 25% чаще', 'perk.start10': 'Новые планеты — с Буром 10 ур.', 'perk.heat': 'Шкала перегрева заполняется на 30% быстрее',
      'perk.crit': 'Шанс крита 12% → 20%', 'perk.engine5': 'Новые планеты — с Двигателем 5 ур.', 'perk.nodes': 'Клады появляются на 30% чаще',
      'perk.over': 'Перегрев длится 12 с', 'perk.plate': 'Тапы наносят +50% урона плитам', 'perk.offline': 'Офлайн-мощность 50% → 75%',
      'perk.start25': 'Новые планеты — с Буром 25 ур.',
      'pre.mul': 'Мощность и доход', 'pre.planet': 'Планета', 'pre.start': 'Бур на старте', 'pre.shards': 'Осколки ядра', 'pre.lose': 'Сбросятся: монеты и улучшения за монеты',
      'pre.run': 'Эта планета заняла {t}', 'arrive.perk': 'Открыт перк: {name}', 'arrive.run': 'Планета {p} пройдена за {t}', 'arrive.best': 'рекорд!',
      'en.mole': 'Крот-воришка! Тапай по нему, чтобы вернуть монеты!', 'en.spider': 'Кристальный паук опутал бур! Тапай по нему!',
      'en.slime': 'Магмовая слизь заклинила бур! Сбей её тапами!', 'en.cavein': 'Обвал! Камни заклинили бур — тапай по ним!',
      'en.gone.mole': 'Крот сбежал с {n} монетами', 'en.gone.other': 'Бур освободился сам', 'en.win': 'Вредитель повержен! +{n} монет',
      'pet.title': 'Помощники', 'pet.hint': 'Живут в шахте и работают, пока игра открыта. Никогда не сбрасываются.',
      'pet.bot': 'Бурбот', 'pet.bot.d': 'Тапает по буру за тебя: {n} тапа/с',
      'pet.bat': 'Мышь-магнит', 'pet.bat.d': 'Хватает клад каждые {n} с',
      'pet.golem': 'Каменный голем', 'pet.golem.d': 'Бьёт вредителей каждые {n} с',
      'pet.hire': 'Нанять', 'pet.lv': 'Ур. {n}/{m}', 'pet.next': 'Следующий уровень: {v}',
      'lab.title': 'Кристальная лаборатория', 'lab.hint': 'Вечные улучшения. Остаются после каждого взрыва ядра.',
      'lab.crit': 'Острая кромка', 'lab.crit.d': 'Сила крита ×{a} → ×{b}',
      'lab.luck': 'Счастливая кирка', 'lab.luck.d': 'Монеты из кладов +{a}% → +{b}%',
      'lab.heat': 'Радиатор', 'lab.heat.d': 'Перегрев {a} с → {b} с',
      'lab.plate': 'Плитолом', 'lab.plate.d': 'Урон по плитам +{a}% → +{b}%',
      'lab.turbo': 'Турбокатушка', 'lab.turbo.d': 'Мощность Турбо ×{a} → ×{b}',
      'forge.title': 'Кузница осколков', 'forge.d': 'Переплавь кристаллы в осколок ядра: +10% к мощности и доходу навсегда. Без лимита, цена растёт.',
      'forge.buy': '+1 осколок', 'forge.count': 'Выковано: {n} · сейчас +{b}%',
      'pet.got': '{name} теперь с тобой!', 'lab.got': '{name}: улучшено!', 'forge.got': 'Осколок ядра выкован! +10%',
    },
  };

  let lang = 'en';
  function setLang(l) { lang = DICT[l] ? l : 'en'; document.documentElement.lang = lang; }
  function t(key, params) {
    let s = DICT[lang][key];
    if (s == null) s = DICT.en[key];
    if (s == null) return key;
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => params[k] != null ? params[k] : m);
    return s;
  }

  const SUF = ['', 'K', 'M', 'B', 'T'];
  function suffix(e3) {
    if (e3 < SUF.length) return SUF[e3];
    const k = e3 - SUF.length;
    return String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + k % 26);
  }
  function group(n) {
    const s = String(Math.floor(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'ru' ? ' ' : ',');
  }
  function fmt(n, dec) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n, dec);
    if (n < 10000) {
      if (dec && n < 100 && n !== Math.floor(n)) {
        const r = Math.round(n * 10) / 10;
        return (lang === 'ru' ? String(r).replace('.', ',') : String(r));
      }
      return group(n);
    }
    if (G.Save?.data?.settings?.notation === 'sci') {
      const e = Math.floor(Math.log10(n));
      let m = n / Math.pow(10, e);
      if (m >= 9.995) return (1).toFixed(2) + 'e' + (e + 1);
      return m.toFixed(2) + 'e' + e;
    }
    let e3 = Math.floor(Math.log10(n) / 3);
    let m = n / Math.pow(1000, e3);
    if (m >= 999.5) { e3++; m /= 1000; }
    const s = m < 10 ? m.toFixed(2) : m < 100 ? m.toFixed(1) : m.toFixed(0);
    return s + suffix(e3);
  }

  function dur(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return t('time.h', { h, m });
    if (m) return t('time.m', { m, s });
    return t('time.s', { s });
  }
  function clock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    const p = v => String(v).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  }

  Object.assign(G, { DICT, t, setLang, fmt, int: group, dur, clock });
  Object.defineProperty(G, 'lang', { get: () => lang, configurable: true });
})();
