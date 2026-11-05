/* 万象天账 · 行路与桥图志
   十幅非方位定案的路线意象，逐条回指天地图 WXMAP.roads。
   图意不覆盖实地测绘；里程、端点与通行边界以路线原记为准。 */
'use strict';

var WXROADSCENES = [
  {
    id: 'bridge-upper', road: '上桥', image: 'assets/routes/bridge-upper.webp',
    alt: '金沟上桥以厚石拱连接两页，桥头朱门验牒，金色水脉在拱下发亮。',
    detail: '晏京的仓帖往枢京请印，走上桥。桥头只验公牒与交接簿的号，不以牒上所写替代事实核验；民概不得渡。离桥后，过桥时刻与文书抵达时刻分开记。'
  },
  {
    id: 'bridge-middle', road: '中桥', image: 'assets/routes/bridge-middle.webp',
    alt: '中桥的石道跨过金沟，桥心铜环仪映着雪岭与远处的暖金灯火。',
    detail: '玄京推步与白京昼贷由中桥相接，官凭方许渡。桥面铜环只供记录日影与启渡刻；影子不能替来人作证，未到对岸的封套仍记在途。'
  },
  {
    id: 'bridge-lower', road: '下桥', image: 'assets/routes/bridge-lower.webp',
    alt: '下桥是雨夜中的低矮木廊桥，檐下垂着铜铃，湿木桥面通向暖灯档案城。',
    detail: '钟京声教与闻京实录由下桥相连，许渡不许留。檐铃记响时，不替桥两端证明交接已经完成；留宿与过桥分开记，归程另点名册。'
  },
  {
    id: 'history-grain-road', road: '历仓道', image: 'assets/routes/history-grain-road.webp',
    alt: '历仓道由悬日楼与高仓之间穿过晨雾，三座驿铺沿直道依次亮灯。',
    detail: '昭京历牌抵晏京，丰仓才依当地实收核粮。四铺为一程，沿途逐铺记车次、封签与所见天气；历牌说明日期，不替仓中粮数作证。'
  },
  {
    id: 'iron-canal-road', road: '铁漕道', image: 'assets/routes/iron-canal-road.webp',
    alt: '铁漕道沿赤京黑石炉坊的运河展开，平底木船载着封捆铁料驶向石桥港口。',
    detail: '赤京记名铁经铁漕道下水，泊平流坊后再核票。封捆数、装船数与卸货数分栏；压舱的铁不算交付，船票只证明承递，不替铁料验质。'
  },
  {
    id: 'law-water-road', road: '律水道', image: 'assets/routes/law-water-road.webp',
    alt: '律水道沿运河穿行，钟楼远影立于岸上，覆篷小船从等距系缆桩旁驶过。',
    detail: '钟京的律钟与澜京的水引沿此道往来。岸上更棚分记启橹、换手、靠泊三刻；钟声可报时，不把同一声响记成货已收讫。'
  },
  {
    id: 'north-register-road', road: '北册道', image: 'assets/routes/north-register-road.webp',
    alt: '北册道在雪岭间经过一排有暖灯的石驿，朱漆封套箱暂避风雪。',
    detail: '白京岁册沿北册道送往枢京复核。遇雪停驿，封套留在原站并注明经手人；未抵不写作已交，重新启程另起一笔。'
  },
  {
    id: 'medicine-end-road', road: '药终道', image: 'assets/routes/medicine-end-road.webp',
    alt: '药终道沿岫京云山的药圃与石阶向远处关门攀升，沿途散落几座休息小亭。',
    detail: '岫京灵药送往冥京注销，山路四铺一程。药材封签按站复核，抵达与注销各记各的时刻；起运不等于抵账，药性也不由路程推定。'
  },
  {
    id: 'wild-history-road', road: '野史道', image: 'assets/routes/wild-history-road.webp',
    alt: '野史道从边地岗亭穿过界桩与灰雾，远处史馆城影只在天光里隐约可见。',
    detail: '闻京与野京之间递送边报。界桩内的驿亭复录来件与转手，桩外只记未抵；失联的路程不替任何人写结论。'
  },
  {
    id: 'west-spine-road', road: '脊道西', image: 'assets/routes/west-spine-road.webp',
    alt: '脊道西贴着两页间的金色装订线蜿蜒，窄桥连起悬空纸崖，沟底留着一枚微小铜影。',
    detail: '图记晏京秤砣坠沟之处，路线沿金沟西脊绕行。这里只画传闻中的路形，不据此判定秤砣所在，也不替无字京补定坐标。'
  }
];
