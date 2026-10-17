# PORTAL: загрузка «Deeper! Idle Drill» в CrazyGames Developer Portal

Портал: https://developer.crazygames.com → **Submit a game**. Ниже значения для полей формы. Названия полей могут слегка отличаться от текущей версии портала, смысл тот же.

## 1. Основное

| Поле | Значение |
|---|---|
| Game name | **Deeper! Idle Drill** (запасное, если имя занято: *Core Driller Idle*) |
| Engine / Upload type | HTML5 |
| Files | `build/deep-drill.zip` (index.html в корне, 18 файлов, ~272 КБ в распакованном виде) |
| SDK integrated | Yes — HTML5 SDK v3 |
| **Progress Save** | **Включить: CrazyGames Data module.** Без этого переключателя Data-модуль отключён, и прогресс не сохраняется в аккаунт |
| Orientation | Desktop: landscape. Mobile: both (portrait и landscape работают) |
| Mobile support | Yes (тач, адаптивная вёрстка, ≤ 20 МБ) |
| In-game purchases | No |
| Multiplayer | No |
| Age / PEGI | PEGI 3 (без насилия и чата) |
| Category | Clicker (Idle) |
| Tags | idle, clicker, mining, drill, pixel, incremental, upgrade, space |

## 2. Description (EN)

**Short:**
Drill through the planet's layers to its core, blow it up and fly to the next world!

**Full:**
Deeper! is a pixel-art idle clicker about a drill digging to the center of the planet. Every meter earns coins, and deeper layers hold richer ore. Upgrade your drill, engine and sorter, smash the stone plates between layers and reach the core. Blow it up, collect core shards for a permanent boost and travel to a new planet!

- 10 layers per planet: from soil to the glowing core
- 5 unique planets and endless progression
- Your drill keeps digging while you're away
- Tap fast to overheat the drill and trigger a ×3 Overdrive
- Grab treasures from the shaft walls: gold, gems, chests and dynamite
- Collect 12 ancient relics for permanent income bonuses
- Watch your drill evolve: diamond and plasma heads, turbines, hydraulic arms and more
- Fight off underground pests: a coin-stealing mole, crystal spiders and magma slimes
- Endless quests, big multi-stage goals and core perks that make every new planet faster
- Spend gems on companions (Drill Bot, Magnet Bat, Rock Golem), Crystal Lab upgrades and the endless Shard Forge
- Treasure carts, a ripening geode, daily tasks and a golden vein every day
- Drill skins: rocket, dragon, gold, neon and unicorn

**Controls:**
- Click / tap the mine or press **Space** — dig faster (also damages plates)
- Click / tap glowing treasures in the walls — collect them
- Click / tap the treasure cart when it rolls by
- Click / tap pests to chase them away
- Hover an upgrade (or tap it on mobile) to see what it does
- **P** — pause, **Esc** — close a window

## 3. Описание (RU, если портал попросит перевод)

**Коротко:** Бури сквозь слои планеты до самого ядра — взорви его и лети дальше!

**Полностью:** Глубже! — пиксельный idle-кликер про бур, который прокладывает путь к центру планеты. Каждый метр приносит монеты, а чем глубже слой, тем дороже руда. Улучшай бур, двигатель и сортировщик, разбивай каменные плиты между слоями и доберись до ядра. Взорви его, получи осколки ядра с постоянным бонусом и отправляйся на новую планету!
• 10 слоёв на каждой планете: от почвы до сияющего ядра
• 5 уникальных планет и бесконечное продолжение
• Бур копает даже без тебя
• Тапай быстро — перегрев включит Overdrive ×3
• Собирай клады из стен шахты: золото, кристаллы, сундуки и динамит
• 12 древних реликвий с вечным бонусом к доходу
• Бур меняется на глазах: алмазная и плазменная головка, турбина, гидравлика
• Подземные вредители: крот-воришка, кристальный паук и магмовая слизь
• Бесконечные квесты, большие цели и перки ядра, с которыми каждая планета идёт быстрее
• Помощники, кристальная лаборатория и кузница осколков за кристаллы
• Тележки с сокровищами, жеода, задания дня и золотая жила

## 4. Медиа

| Что | Файл | Требование CG |
|---|---|---|
| Landscape cover | `promo/cover-landscape-1920x1080.png` | 16:9, 1920×1080 |
| Portrait cover | `promo/cover-portrait-800x1200.png` | 2:3, 800×1200 |
| Square cover | `promo/cover-square-800x800.png` | 1:1, 800×800 |
| Landscape video | `videos/deep-drill-landscape.mp4` | 1920×1080, 16:9, 19,5 с, H.264, без звука |
| Portrait video | `videos/deep-drill-portrait.mp4` | 1080×1620, 2:3, 19,5 с, H.264, без звука |

На обложках только название игры, без рамок и надписей вроде «Play». Видео начинается с обложки, дальше идёт геймплей: старт у вышки, клады, перегрев, крот, разбитая плита, взрыв ядра и перелёт. Курсора, чёрных полос и звука нет.

## 4а. Повторная подача (после отказа «quality»)

В FAQ CrazyGames сказано, что отклонённую игру можно подать снова, если в ней есть существенные улучшения. Если в портале есть поле для комментария или ты отвечаешь на письмо, вот готовый текст:

> Thanks for the review. We reworked Deeper! Idle Drill based on the quality guidelines:
> - New custom pixel font across the whole UI and a cleaner first screen (fewer pop-ups, queued notifications, no clutter over the drill).
> - Dynamic lighting in the mine (drill headlamp, shaft lamps, glowing treasures), a surface mining station and a title splash.
> - Juicier feedback: coins and gems fly into the counters, the drill visibly evolves with upgrades (new heads, turbine, arms, cargo).
> - New chiptune soundtrack with melody, bass and drums.
> - A faster first minute: first upgrade in seconds, first plate and treasures within the first minute, quests from the start.
> - Active play on top of idle: treasures in the walls, Overdrive, crits, underground pests, companions.
> - New covers and 1080p MP4 preview videos (landscape and portrait).

## 5. Как проходит запуск

1. **Basic Launch:** реклама на CG ещё отключена. Игра это видит по ошибке `adsDisabledBasicLaunch` и прячет rewarded-кнопки, поэтому «пустых» кнопок нет.
2. **Full Launch** (после отбора): реклама включается сама, код менять не нужно.

## 6. Чеклист (адаптация STANDARD §14 под CrazyGames)

**Архив**
- [x] `index.html` в корне zip, имена латиницей, 18 файлов (лимит 1500), 0,27 МБ (лимит 50 МБ / 20 МБ для мобильной главной)
- [x] Внешний запрос только к `sdk.crazygames.com` (проверено автотестом), пути относительные
- [x] `promo/`, `tools/`, `videos/` не попали в архив

**SDK**
- [x] SDK v3 в `<head>` до кода игры; `SDK.init()` один раз
- [x] `loadingStart/loadingStop`; `gameplayStart` при старте, `gameplayStop/Start` на окнах и рекламе, без спама (≤ 1/с)
- [x] `settings.muteAudio` и `addSettingsChangeListener` учитываются
- [x] Сохранение через Data-модуль; гость → вход синхронизируется через `addAuthListener`
- [x] Страховка сохранения: копия на устройстве по аккаунту, выбор копии с наибольшим прогрессом, тайм-ауты вызовов SDK (проверено автотестом)
- [x] Язык из `user.systemInfo.locale`, по умолчанию EN

**Реклама**
- [x] Midgame только в логических паузах (новый слой, перелёт), не на кнопках навигации и не во время игры
- [x] Во время запроса и показа UI заблокирован, игра на паузе; звук глушится на `adStarted`
- [x] Rewarded — только в отдельных окнах, с иконкой видео и ясной наградой, есть альтернатива без рекламы, нет цепочек реклам
- [x] При `adError` награда не выдаётся, при adblock/basic launch кнопки скрыты, игра полностью проходима

**Качество**
- [x] Нет своей кнопки fullscreen, нет внешних ссылок и кросс-промо
- [x] Текст читается на 800×450, 821×462, 1280×720, 1920×1080 и в портрете 390×844 (скриншоты в `screenshots/`)
- [x] Физика и таймеры на `dt`, не зависят от частоты монитора (144/165 Гц)
- [x] Автотест: 82/82, ошибок в консоли нет

**Проверить руками 👤**
- [ ] Игра 10 минут на ПК и на телефоне: FPS стабилен
- [ ] Поворот телефона посреди игры: ничего не обрезано
- [ ] Свернуть вкладку на 2+ минуты: при возврате окно офлайна, звук не играл в фоне
- [ ] После загрузки в портал открыть превью (QA tool) и проверить вход через CrazyGames-аккаунт: прогресс переносится


