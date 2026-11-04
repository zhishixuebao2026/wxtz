/* 万象天账 · 地物图志
   天地图旁的意象图卡。 */
'use strict';

var WXPLACES = [
  { id: 'ash-corridor', name: '灰廊', region: '页缝之间', image: 'assets/places/ash-corridor.webp',
    alt: '纸页夹层中一条被灯笼照亮、向远处折返的灰廊。',
    note: '账页与账页之间的夹缝；跨期者循此往来。路形随所记之事而变，不作地图上的固定通道。' },
  { id: 'cancellation-pit', name: '冲销坑', region: '待核之境', image: 'assets/places/cancellation-pit.webp',
    alt: '层层纸页岩壁围成的深坑，窄径沿崖壁盘旋而下。',
    note: '年结未平且异源复核未成的事项暂留此处；入坑只表示勾稽未成，不是裁罪，更不牵连整个人。' },
  { id: 'debtless-sea', name: '废账海', region: '页外', image: 'assets/places/debtless-sea.webp',
    alt: '灰蓝色海面漂着空白纸页，雾中有书页形状的远岛。',
    note: '作废账页漂泊成海；被推翻的预言、失约的誓言与不再成立的旧世界，都可在此留下回声。' },
  { id: 'heavenly-ledger-court', name: '天账庭', region: '无字京 · 方位存疑', image: 'assets/places/heavenly-ledger-court.webp',
    alt: '云上的空旷庭院设有长案、铜衡与层层石阶。',
    note: '传说中的存疑之庭。空格留的是问题，不是预定的人；庭址与实有仍待核。' },
  { id: 'copytower-interior', name: '抄本楼内景', region: '闻京', image: 'assets/places/copytower-interior.webp',
    alt: '闻京抄本楼高架书格、木廊与暖光交叠的室内。',
    note: '天下账册在此存副本。错抄之字不许改回，旁注须留来由；同一底本抄十遍，仍只是一只眼睛。' },
  { id: 'central-ledger-thirteenth-floor', name: '中枢大账房第十三层', region: '枢京', image: 'assets/places/central-ledger-thirteenth-floor.webp',
    alt: '中枢大账房幽深的木构长廊与一扇未点灯的门。',
    note: '没有账目往来的楼层，却有传闻中的多一双饭箸。所见仅是门、灯与更鼓，不替空屋认定住客。' },
  { id: 'hanging-sun-tower-interior', name: '悬日楼内景', region: '昭京', image: 'assets/places/hanging-sun-tower-interior.webp',
    alt: '悬日楼观测室中的铜晷与空金框，日光投下一道长影。',
    note: '照影授时之处。慢一息只记为钟与校时簿之间的待核差异，不转记于人。' },
  { id: 'golden-gutter-binding-line', name: '金沟装订线', region: '两页之间', image: 'assets/places/golden-gutter-binding-line.webp',
    alt: '两片纸页峭壁之间，一道金色水脉穿过三座小桥。',
    note: '阴阳两页相接的百丈沟。沟底有路只是传言；桥、桩与水色各有所记。' },
  { id: 'ashen-corridor-outpost', name: '灰廊口荒岗', region: '野京边地 · 灰廊口', image: 'assets/places/ashen-corridor-outpost.webp',
    alt: '风过灰色荒岗，矮小木亭与界桩守着通向雾中的窄道。',
    note: '界桩绳走到中界便断的地方。岗亭只记来往与交接；路外仍是雾，不因一张图而取得方位。' },
  { id: 'nether-capital-ticket-vault', name: '冥京地下票库', region: '冥京 · 九层地下', image: 'assets/places/nether-capital-ticket-vault.webp',
    alt: '冥京地底的石砌票库，层架沿阶梯延入蓝黑色深处。',
    note: '九层皆向下，归票在此核验去处。票不认名，交接凭据与亡者身份分开复核。' }
];
