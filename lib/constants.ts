export const VERSION = 'V4.0.2-20250609';

export const t = {
  title: `童設計 ${VERSION}`,
  tabs: { path1: '理念', path2: '色彩', path3: '參考', path4: '工藝', path5: '微調' },
  fields: {
    eventName: '活動名稱',
    textZh: '文字輸入欄(中)',
    textEn: '文字輸入欄(英)',
    style: '風格',
    concept: '設計概念',
    audience: '受眾對象',
    emotion: '核心情感',
    colorControl: '色彩控制',
    randomColor: '隨機色彩',
    refItem: '參考項目',
    upload: '上載檔案 (MAX 3)',
    refPlaceholder: '例子：圖中風格 / 整張圖片內容複製 / 參考圖中主體顏色',
    craftMenu: '工藝選單',
    shapeMenu: '形狀選單',
    logoShapeMenu: 'LOGO 形狀',
    souvenirShapeMenu: 'LOGO 形狀',
    souvenirType: '種類選單',
    custom: '自訂',
    preciseLabel: '微調指示',
    precisePlaceholder: '請輸入具體的修改指令，例如：「將紅色部分改為黃色」、「線條再加粗一點」...',
    preciseExample: '💡 精確指示範例：',
    preciseTip: '「眼神更兇惡一點」、「爪更利一點」、「牙更長一點」、「字體更小一點」',
    customCraftPlaceholder: '請自行輸入特定工藝...',
    customShapePlaceholder: '請自行輸入特定形狀...',
    customTypePlaceholder: '請自行輸入特定種類...',
    aiExpand: 'AI 視覺聯想',
    aiDraw: 'AI 繪圖',
    stylePlaceholder: '例子：極簡線條、立體浮雕、復古電繪、3D 渲染',
    conceptPlaceholder: '例子：一個關於貓與羊的幾何圖騰，四色平衡，要有頂級金屬烤漆的厚重感',
    designerNote: '專業諮詢：設計師想知道您的細節'
  },
  categories: { badge: '徽章', necker: '2D 巾圈', souvenir: '紀念品', necker3d: '3D 巾圈' },
  buttons: {
    genDesign: '生成設計圖',
    genMockup: '成品模擬',
    tweakDesign: '設計微調',
    tweakMockup: '成品微調',
    viewDesign: '設計圖',
    viewMockup: '成品模擬',
    view3d: '3D 預覽',
    gen3d: '3D 製作',
    waiting: '等待生成視圖',
    processing: 'AI 正在計算中...',
    clear: '清空設計',
    genPromptOnly: '僅生成設計指令',
    genMockupPromptOnly: '僅生成工藝指令'
  },
  prompts: { design: '設計師協作指令', mockup: '工藝模擬指令' },
  errors: {
    quotaExceeded: '⚠️ AI 配額已耗盡：目前的生成額度已達上限，請稍後再試。Pollinations 免費方案有速率限制（約每 15 秒一次）。',
    generic: '⚠️ 生成失敗：請檢查網絡連線、輸入內容，或 Pollinations 伺服器可能暫時繁忙。'
  }
};

export const CATEGORY_CONFIG: Record<string, {
  crafts: string[];
  shapes: string[];
  types: string[];
}> = {
  badge: {
    crafts: ['機繡/電腦刺繡', '織嘜/織布章', '滴膠/軟膠徽章', '金屬實色琺瑯', '印刷布章', '自訂'],
    shapes: ['圓形', '盾形', '方形', '不規則形', '自訂'],
    types: ['徽章']
  },
  necker: {
    crafts: ['皮革製 (Leather)', '亞克力製 (Acrylic)', 'PVC 軟膠 (平面/2.5D)', '刺繡布環 (Embroidery Loop)', '自訂'],
    shapes: ['菱形', '橢圓', '長方形', '自訂'],
    types: ['2孔式 (上下開孔)', '3孔式 (中央加開孔)', '圓環式 (後置環扣)', '自訂']
  },
  necker3d: {
    crafts: ['PVC 軟膠 (立體分層)', '金屬沖壓 (實心厚重)', '3D 樹脂列印 (高精度)', '3D 雕塑造型 (3D Figurine)', '自訂'],
    shapes: [],
    types: ['整體+後置圓環', '頭部+後置圓環', '整體造型', '僅頭部造型', '穿透式造型', '編織土耳其結']
  },
  souvenir: {
    crafts: ['雷射雕刻', '絲印', 'UV 噴墨', '自訂'],
    shapes: ['圓形', '方形', '不規則形', '自訂'],
    types: ['自訂']
  }
};
