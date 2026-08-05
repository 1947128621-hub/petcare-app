import type {
  Pet, PetRecord, QAChat, Drug, DailyTip, Announcement, AdConfig, QuestionType,
  Reminder, NearbyPlace, FoodItem, WalkLog, HealthCheck,
  Achievement, Course, TaskDefinition, PetSpecies,
} from "./types";

// ===== 初始示例数据 =====

export const seedPets: Pet[] = [
  {
    id: "pet_demo_1",
    name: "橘大力",
    species: "cat",
    breed: "中华田园猫",
    age: 3,
    weight: 5.2,
    gender: "male",
    avatar: "🐱",
    birthday: "2023-04-12",
    notes: "性格亲人，爱吃小鱼干",
    createdAt: "2026-07-15T10:00:00Z",
  },
  {
    id: "pet_demo_2",
    name: "豆豆",
    species: "dog",
    breed: "金毛",
    age: 5,
    weight: 28.5,
    gender: "female",
    avatar: "🐶",
    birthday: "2021-08-20",
    notes: "大型犬，每天需要 1 小时运动",
    createdAt: "2026-07-20T14:30:00Z",
  },
];

export const seedRecords: PetRecord[] = [
  {
    id: "rec_1",
    petId: "pet_demo_1",
    type: "photo",
    title: "今日份的可爱",
    content: "趴在窗台晒太阳的小懒猫 ☀️",
    createdAt: "2026-08-03T09:12:00Z",
  },
  {
    id: "rec_2",
    petId: "pet_demo_1",
    type: "weight",
    title: "体重记录",
    content: "本月体重稳定",
    meta: { weight: 5.2, change: 0 },
    createdAt: "2026-08-02T18:30:00Z",
  },
  {
    id: "rec_3",
    petId: "pet_demo_1",
    type: "medical",
    title: "体内驱虫",
    content: "拜耳拜宠清 · 1 片，喂食顺利",
    createdAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "rec_4",
    petId: "pet_demo_2",
    type: "note",
    title: "今天体检结果",
    content: "医生说一切正常，继续保持",
    createdAt: "2026-07-30T15:20:00Z",
  },
];

// ===== AI 问答库（mock，按 4 种类型）=====
// 关键词 → 答案 的简易匹配引擎
export const qaDatabase: Record<QuestionType, Array<{ keywords: string[]; answer: string; isVipOnly?: boolean; relatedDrugIds?: string[] }>> = {
  "饮食": [
    {
      keywords: ["吃什么", "猫粮", "狗粮", "喂什么", "挑食", "不吃饭", "食欲"],
      answer: "建议选择主粮时关注三点：1）蛋白质来源（鲜肉 > 肉粉 > 植物蛋白）；2）粗蛋白比例（成猫 ≥ 26%，成犬 ≥ 18%）；3）避免诱食剂。挑食可先饿 6-8 小时再喂，不要轻易换粮（7 日换粮法）。",
      relatedDrugIds: [],
    },
    {
      keywords: ["零食", "能吃", "人可以吃的", "巧克力", "葡萄", "洋葱"],
      answer: "⚠️ 以下食物对宠物致命：巧克力、葡萄/葡萄干、洋葱/大蒜、木糖醇、咖啡、酒精、生面团、牛油果。安全的人类零食：少量水煮鸡胸肉、蒸南瓜、原味酸奶。",
      isVipOnly: true,
    },
    {
      keywords: ["水", "喝水少", "不喝水"],
      answer: "猫咪天性饮水量低，容易引发泌尿问题。建议：1）流动饮水机（猫咪更爱活水）；2）多放水碗（远离猫砂盆和食盆）；3）主食罐补水（水分 75%+）；4）观察尿团，正常每天 2-3 个。",
    },
    {
      keywords: ["多少", "量", "一天几次", "喂多少"],
      answer: "通用公式：成猫每日热量 = 体重(kg) × 60-80 kcal；成犬 = 体重(kg) × 30 × 1.6。折算成粮：猫约 60-80g/天，中型犬 200-400g/天。幼年/怀孕/运动量大需增加 30-50%。",
    },
  ],
  "疾病": [
    {
      keywords: ["拉稀", "腹泻", "拉肚子", "软便", "拉血"],
      answer: "急性腹泻 24 小时内可禁食不禁水 6-12 小时，之后少量多餐（鸡胸肉 + 南瓜泥）。伴随以下任一情况立即就医：便血、呕吐、嗜睡、幼龄/老龄、超过 48 小时未愈。常见原因：换粮过快、误食、寄生虫、炎症性肠病。",
      relatedDrugIds: ["drug_digestive_01"],   // 宠物益生菌(原 drug_3)
    },
    {
      keywords: ["呕吐", "吐了", "反胃"],
      answer: "先观察呕吐物：未消化食物（吃太快）、黄色胆汁（空腹过久）、白色泡沫（肠胃刺激）、血丝（立即就医）。单次呕吐且精神好可观察 12 小时，反复呕吐/伴腹泻/嗜睡需就医。",
    },
    {
      keywords: ["咳嗽", "打喷嚏", "流鼻涕", "感冒"],
      answer: "上呼吸道症状常见于：感冒（自限性 7-10 天）、猫疱疹（反复发作）、犬窝咳（咳嗽+干呕）。建议：保持环境湿度 50-60%、隔离其他宠物、补充赖氨酸（猫）。超过 5 天或加重需就医。",
      relatedDrugIds: ["drug_antiinf_03"],   // 速诺(原 drug_5)
    },
    {
      keywords: ["皮肤病", "掉毛", "抓痒", "红疹", "螨虫"],
      answer: "常见原因：1）体外寄生虫（跳蚤/螨虫，需驱虫）；2）真菌感染（圆形脱毛，需伍德氏灯检查）；3）过敏（食物/环境，需排查）。建议先做皮肤刮片检查再用药，避免乱用激素。",
      relatedDrugIds: ["drug_skin_02", "drug_skin_06"],   // 可鲁 + 酮康唑(原 drug_4 皮特芬 → 用 v0.4.0 真药)
      isVipOnly: true,
    },
    {
      keywords: ["眼睛", "流泪", "红眼", "分泌物"],
      answer: "少量黑色眼屎正常。异常情况：黄绿色脓性分泌物（结膜炎/角膜溃疡，需立即就医）、单眼流泪（可能异物）、双眼流泪伴打喷嚏（疱疹病毒）。日常清洁用宠物专用洗眼液。",
    },
  ],
  "行为": [
    {
      keywords: ["叫", "喵喵叫", "乱叫", "凌晨叫", "半夜叫"],
      answer: "猫咪凌晨叫常见原因：1）发情（未绝育）；2）精力过剩（睡前陪玩 20 分钟）；3）饥饿（设自动喂食器凌晨 5 点少量加餐）；4）健康问题（疼痛/甲亢，多见于老年猫）。",
    },
    {
      keywords: ["抓", "挠沙发", "磨爪", "抓家具"],
      answer: "猫咪磨爪是本能（标记+磨指甲）。正确引导：1）准备 2-3 个猫抓板（竖立+水平+瓦楞纸材质）；2）放在睡觉区域和常去位置；3）用猫薄荷/木天蓼吸引；4）被抓部位贴双面胶或铝箔。",
    },
    {
      keywords: ["咬人", "攻击", "凶", "哈气"],
      answer: "突然攻击行为排查：1）疼痛（触摸某处反应剧烈→就医）；2）恐惧（陌生环境/人/气味）；3）资源守卫（吃饭/上厕所时被打扰）；4）玩耍性攻击（幼猫多见，用逗猫棒代替手）。",
    },
    {
      keywords: ["分离焦虑", "独自在家", "拆家", "叫个不停"],
      answer: "犬分离焦虑缓解：1）出门前 30 分钟不互动（降低告别仪式感）；2）提供 KONG 漏食玩具分散注意力；3）逐步延长独处时间（5min→30min→2h）；4）出门/回家保持平静；5）严重时考虑行为训练师。",
    },
  ],
  "用药": [
    {
      keywords: ["驱虫", "体内", "体外", "虫"],
      answer: "推荐驱虫方案：体内 3 月 1 次（拜耳拜宠清），体外 1 月 1 月（福来恩/超可信）。幼猫/幼犬 2 周龄起首次驱虫。常用搭配：大宠爱（内外同驱）+ 海乐妙。",
      relatedDrugIds: ["drug_deworm_02", "drug_deworm_01"],   // 拜耳 + 福来恩(原 drug_1, drug_2)
    },
    {
      keywords: ["疫苗", "打针", "免疫", "几联"],
      answer: "猫咪核心疫苗：猫三联（妙三多）3 针 + 狂犬 1 针；犬核心疫苗：DHPP（五联）4 针 + 狂犬 1 针。完成首年免疫后每年加强 1 针。注射前确认宠物健康，驱虫与疫苗间隔 1 周。",
      relatedDrugIds: ["drug_vaccine_01"],   // 妙三多(原 drug_6)
    },
    {
      keywords: ["益生菌", "肠胃宝", "调理"],
      answer: "益生菌适用场景：腹泻/便秘/换粮/抗生素后。推荐品牌：布拉迪酵母菌（真菌源，耐抗生素）、宠物专用复合益生菌（FortiFlora）。温水冲服，40℃ 以下。",
      relatedDrugIds: ["drug_digestive_01"],   // 宠物益生菌(原 drug_3)
    },
    {
      keywords: ["消炎", "抗生素", "阿莫西林"],
      answer: "⚠️ 宠物抗生素禁止使用人药阿莫西林！剂量、剂型、辅助成分都可能致命。正确做法：就医做药敏试验后使用宠物专用抗生素（速诺/拜有利）。",
      isVipOnly: true,
    },
  ],
};

// ===== 药品库 =====
// v0.4.0 改造 (实施员 3 负责):10 → 52 款真实药品
// - 11 个分类全覆盖(驱虫/疫苗/肠胃/皮肤/关节/心脏/肾脏/眼耳/抗感染/止痛/其他)
// - 新增字段:indications[] / contraindications / isPromoted / promotedRank
// - 推广药 4 款(驱虫 2 + 疫苗 1 + 肠胃 1)
// - 数据源:src/lib/drugs/seed-v040.ts(本文件仅 re-export,业务代码引用路径不变)
export { seedDrugsV040 as seedDrugs } from "./drugs/seed-v040";
// 备注:原 10 款 inline 数组已删除,统一从 ./drugs/seed-v040 取数
//      业务侧 `import { seedDrugs } from "./data"` 路径不变
// 旧 10 款 inline 数据(drug_1..drug_10)已删除,见 seed-v040.ts

// ===== 每日小贴士 =====
export const seedTips: DailyTip[] = [
  { id: "t1", title: "夏季防中暑", content: "气温超过 30℃ 时，遛狗时间选在清晨或傍晚。地面温度可能比气温高 10℃，用手背贴地 5 秒测试。", category: "季节", icon: "☀️", publishedAt: "2026-08-03" },
  { id: "t2", title: "猫咪吐毛球怎么办", content: "每周给猫梳毛 2-3 次可减少 80% 毛球。化毛膏每周 2-3cm 即可，过量反而影响吸收。", category: "健康", icon: "🐱", publishedAt: "2026-08-02" },
  { id: "t3", title: "幼犬社会化黄金期", content: "3-12 周龄是社会化关键期，多接触不同的人、动物、环境，长大后性格更稳定。", category: "行为", icon: "🐶", publishedAt: "2026-08-01" },
  { id: "t4", title: "罐头喂食小贴士", content: "开封后冷藏不超过 3 天，室温不超过 2 小时。冬季可微波 5 秒加温，香气更浓。", category: "饮食", icon: "🥫", publishedAt: "2026-07-31" },
  { id: "t5", title: "猫咪挑食纠正", content: "不要轻易换粮！使用 7 日换粮法。挑食多因零食过多，戒零食 2 周见效。", category: "饮食", icon: "🍽️", publishedAt: "2026-07-30" },
  { id: "t6", title: "夏季驱虫别松懈", content: "蚊子活跃期（6-9 月）心丝虫风险升高。每月一次体外驱虫，犬还需每月口服心丝虫药。", category: "健康", icon: "🦟", publishedAt: "2026-07-29" },
  { id: "t7", title: "狗狗游泳后护理", content: "游完泳立即用清水冲洗，去除氯/盐水。彻底擦干耳朵（棉球吸干），预防外耳炎。", category: "健康", icon: "🏊", publishedAt: "2026-07-28" },
];

// ===== 系统公告 =====
export const seedAnnouncements: Announcement[] = [
  { id: "n1", title: "v0.1.0 全新上线", content: "欢迎使用毛球日记！本次更新：AI 健康问答、药品推荐、会员系统上线。", type: "update", publishedAt: "2026-08-03", version: "0.1.0" },
  { id: "n2", title: "新药品库已更新", content: "新增 10 种常用宠物药品，包含驱虫、疫苗、肠胃、皮肤、关节等分类。", type: "update", publishedAt: "2026-08-02", version: "0.1.0" },
  { id: "n3", title: "会员限时活动", content: "SVIP 年卡 7 折，限时 7 天。解锁全部 AI 问答 + 高级药品库。", type: "event", publishedAt: "2026-08-01" },
  { id: "n4", title: "每日小贴士功能上线", content: "每天学一点，养宠不焦虑。在「我的」-「每日小贴士」查看。", type: "update", publishedAt: "2026-07-30", version: "0.1.0" },
];

// ===== 广告位配置 =====
export const seedAds: AdConfig[] = [
  {
    id: "ad_banner_1",
    type: "banner",
    title: "新会员首月 1 元",
    description: "开通 VIP，畅享 AI 问答 + 高级药品库",
    badge: "广告",
    bgGradient: "bg-gradient-vip",
    emoji: "🎁",
    ctaText: "立即开通",
    weight: 10,
    active: true,
  },
  {
    id: "ad_sidebar_1",
    type: "sidebar",
    title: "宠物保险 · 月付 ¥19.9",
    description: "意外医疗最高赔付 80%",
    badge: "广告",
    bgGradient: "bg-gradient-svip",
    emoji: "🛡️",
    ctaText: "了解详情",
    weight: 5,
    active: true,
  },
  {
    id: "ad_bottom_1",
    type: "bottom",
    title: "在线问诊 · 三甲兽医 7×24",
    description: "首次问诊仅 ¥1",
    badge: "广告",
    bgGradient: "bg-gradient-warm",
    emoji: "👨‍⚕️",
    ctaText: "立即咨询",
    weight: 8,
    active: true,
  },
  {
    id: "ad_popup_1",
    type: "popup",
    title: "邀请好友，各得 ¥30",
    description: "分享给养宠的朋友，一起薅羊毛",
    badge: "广告",
    bgGradient: "bg-gradient-warm",
    emoji: "💝",
    ctaText: "立即邀请",
    weight: 3,
    // v0.3.2 — 弹窗广告默认关闭，避免破坏首屏体验。仅在运营开启"限时活动"等场景下才打开。
    active: false,
  },
];

// ===== 会员权益 =====
export const membershipPlans = [
  {
    tier: "free" as const,
    name: "免费用户",
    priceMonthly: 0,
    priceYearly: 0,
    color: "bg-white border-[var(--color-border)]",
    features: [
      { text: "基础 AI 问答（每日 3 次）", included: true },
      { text: "查看免费药品", included: true },
      { text: "宠物档案 + 拍照记事", included: true },
      { text: "高级 AI 问答（无限）", included: false },
      { text: "VIP 专属药品库", included: false },
      { text: "AI 病历分析报告", included: false },
      { text: "1 对 1 兽医咨询", included: false },
    ],
  },
  {
    tier: "vip" as const,
    name: "VIP 会员",
    priceMonthly: 19,
    priceYearly: 188,
    color: "bg-gradient-vip text-white",
    features: [
      { text: "基础 AI 问答（每日 3 次）", included: true },
      { text: "查看免费药品", included: true },
      { text: "宠物档案 + 拍照记事", included: true },
      { text: "高级 AI 问答（无限）", included: true },
      { text: "VIP 专属药品库", included: true },
      { text: "AI 病历分析报告", included: true },
      { text: "1 对 1 兽医咨询", included: false },
    ],
  },
  {
    tier: "svip" as const,
    name: "SVIP 至尊",
    priceMonthly: 49,
    priceYearly: 468,
    color: "bg-gradient-svip text-white",
    features: [
      { text: "基础 AI 问答（每日 3 次）", included: true },
      { text: "查看免费药品", included: true },
      { text: "宠物档案 + 拍照记事", included: true },
      { text: "高级 AI 问答（无限）", included: true },
      { text: "VIP 专属药品库", included: true },
      { text: "AI 病历分析报告", included: true },
      { text: "1 对 1 兽医咨询（每月 2 次）", included: true },
    ],
  },
];

// ===== v0.2 新增 mock 数据 =====

// ----- 预设提醒（3 条，给"橘大力"和"豆豆"初始化用）-----
export const seedReminders: Reminder[] = [
  {
    id: "rem_1",
    petId: "pet_demo_1",
    category: "驱虫",
    title: "体外驱虫",
    description: "福来恩滴剂 · 拨开颈后毛发滴于皮肤",
    repeat: "monthly",
    nextAt: "2026-08-15T09:00:00Z",
    remindBefore: 60,
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "rem_2",
    petId: "pet_demo_1",
    category: "疫苗",
    title: "妙三多加强针",
    description: "首年免疫完成后每年加强 1 针",
    repeat: "yearly",
    nextAt: "2027-04-12T10:00:00Z",
    remindBefore: 1440, // 提前 1 天
    active: true,
    createdAt: "2026-04-12T00:00:00Z",
  },
  {
    id: "rem_3",
    petId: "pet_demo_2",
    category: "洗澡",
    title: "洗澡美容",
    description: "金毛每 2 周洗一次澡",
    repeat: "weekly",
    nextAt: "2026-08-10T14:00:00Z",
    remindBefore: 120,
    active: true,
    createdAt: "2026-08-01T00:00:00Z",
  },
];

// ----- 附近的宠物医院/宠物店（6 个）-----
export const seedPlaces: NearbyPlace[] = [
  { id: "p1", name: "瑞鹏宠物医院（朝阳分院）", category: "hospital", address: "北京市朝阳区建国路 88 号", distance: 1.2, phone: "010-1234-5678", rating: 4.8, openHours: "09:00-22:00", tags: ["24h急诊", "绝育", "牙科"], lat: 39.9087, lng: 116.4569 },
  { id: "p2", name: "美联众合·爱诺动物医院", category: "hospital", address: "北京市朝阳区光华路 21 号", distance: 2.5, phone: "010-2345-6789", rating: 4.6, openHours: "10:00-21:00", tags: ["皮肤专科", "肿瘤科"], lat: 39.9089, lng: 116.4612 },
  { id: "p3", name: "芭比堂动物医院", category: "hospital", address: "北京市海淀区中关村大街 1 号", distance: 3.8, phone: "010-3456-7890", rating: 4.7, openHours: "09:30-21:30", tags: ["心脏专科", "24h急诊"], lat: 39.9836, lng: 116.3164 },
  { id: "p4", name: "萌宠星球宠物店", category: "petshop", address: "北京市朝阳区三里屯太古里 N3-30", distance: 0.8, phone: "010-4567-8901", rating: 4.9, openHours: "10:00-22:00", tags: ["进口粮", "宠物用品", "造型"], lat: 39.9367, lng: 116.4554 },
  { id: "p5", name: "小佩宠物（SOLANA 店）", category: "petshop", address: "北京市朝阳区蓝色港湾 SOLANA 商场", distance: 2.1, phone: "010-5678-9012", rating: 4.7, openHours: "10:00-22:00", tags: ["智能用品", "猫砂", "饮水机"], lat: 39.9087, lng: 116.4801 },
  { id: "p6", name: "萌犬森林宠物乐园", category: "park", address: "北京市朝阳区东风公园北门", distance: 4.2, phone: "010-6789-0123", rating: 4.5, openHours: "06:00-22:00", tags: ["大型犬区", "小型犬区", "饮水"], lat: 39.9298, lng: 116.4823 },
];

// ----- 食物/猫粮狗粮库（8 种）-----
export const seedFoods: FoodItem[] = [
  { id: "f1", brand: "渴望 (Orijen)", name: "六种鲜鱼配方全期猫粮", forSpecies: ["cat"], lifeStage: "全期",
    crudeProtein: 40, crudeFat: 18, crudeFiber: 3, moisture: 10,
    topIngredients: ["新鲜整鱼", "鱼肉粉", "新鲜内脏"],
    hasGrain: false, hasArtificialAdditive: false, hasAllergen: ["鱼"],
    pricePerKg: 158, rating: 4.8,
    suitableFor: ["成猫", "高蛋白需求", "美毛"],
    notSuitableFor: ["鱼过敏", "肾病猫"] },
  { id: "f2", brand: "爱肯拿 (Acana)", name: "农场盛宴全期猫粮", forSpecies: ["cat"], lifeStage: "全期",
    crudeProtein: 33, crudeFat: 15, crudeFiber: 4, moisture: 10,
    topIngredients: ["新鲜鸡肉", "火鸡肉", "鸡蛋"],
    hasGrain: false, hasArtificialAdditive: false, hasAllergen: ["鸡"],
    pricePerKg: 98, rating: 4.6,
    suitableFor: ["成猫", "室内猫", "敏感肠胃"],
    notSuitableFor: ["鸡蛋白过敏"] },
  { id: "f3", brand: "皇家 (Royal Canin)", name: "室内成猫粮", forSpecies: ["cat"], lifeStage: "成",
    crudeProtein: 27, crudeFat: 13, crudeFiber: 5.5, moisture: 5.5,
    topIngredients: ["鸡肉粉", "米", "玉米"],
    hasGrain: true, hasArtificialAdditive: true, hasAllergen: ["鸡", "谷物"],
    pricePerKg: 55, rating: 4.2,
    suitableFor: ["室内成猫", "控制体重", "便臭管理"],
    notSuitableFor: ["谷物过敏", "对添加剂敏感"] },
  { id: "f4", brand: "巅峰 (Ziwi)", name: "风干牛肉猫罐头", forSpecies: ["cat"], lifeStage: "全期",
    crudeProtein: 38, crudeFat: 30, crudeFiber: 2, moisture: 5,
    topIngredients: ["牛肉", "牛心", "牛肝"],
    hasGrain: false, hasArtificialAdditive: false, hasAllergen: ["牛"],
    pricePerKg: 320, rating: 4.9,
    suitableFor: ["挑食猫", "高蛋白", "补水"],
    notSuitableFor: ["预算有限", "牛过敏"] },
  { id: "f5", brand: "欧冠 (Orijen)", name: "原始猎食犬粮", forSpecies: ["dog"], lifeStage: "全期",
    crudeProtein: 38, crudeFat: 18, crudeFiber: 4, moisture: 12,
    topIngredients: ["新鲜鸡肉", "新鲜鱼肉", "鸡蛋"],
    hasGrain: false, hasArtificialAdditive: false, hasAllergen: ["鸡", "鱼"],
    pricePerKg: 128, rating: 4.7,
    suitableFor: ["成犬", "高运动量", "美毛"],
    notSuitableFor: ["对鸡/鱼过敏"] },
  { id: "f6", brand: "皇家 (Royal Canin)", name: "金毛成犬专用粮", forSpecies: ["dog"], lifeStage: "成",
    crudeProtein: 25, crudeFat: 14, crudeFiber: 3.5, moisture: 9.5,
    topIngredients: ["鸡肉粉", "米", "玉米"],
    hasGrain: true, hasArtificialAdditive: true, hasAllergen: ["鸡", "谷物"],
    pricePerKg: 62, rating: 4.4,
    suitableFor: ["金毛成犬", "关节保健", "美毛"],
    notSuitableFor: ["谷物过敏"] },
  { id: "f7", brand: "纽顿 (Nutram)", name: "T22 鸡肉成犬粮", forSpecies: ["dog"], lifeStage: "成",
    crudeProtein: 26, crudeFat: 15, crudeFiber: 4, moisture: 10,
    topIngredients: ["鸡肉粉", "燕麦", "糙米"],
    hasGrain: true, hasArtificialAdditive: false, hasAllergen: ["鸡", "燕麦"],
    pricePerKg: 48, rating: 4.3,
    suitableFor: ["中型犬", "敏感皮肤", "性价比"],
    notSuitableFor: ["对燕麦敏感"] },
  { id: "f8", brand: "比瑞吉 (Beerge)", name: "小型犬幼犬粮", forSpecies: ["dog"], lifeStage: "幼",
    crudeProtein: 28, crudeFat: 16, crudeFiber: 3, moisture: 10,
    topIngredients: ["鸡肉粉", "大米", "鸡油"],
    hasGrain: true, hasArtificialAdditive: true, hasAllergen: ["鸡", "谷物"],
    pricePerKg: 38, rating: 4.0,
    suitableFor: ["小型犬幼犬", "高能量", "美毛"],
    notSuitableFor: ["谷物过敏"] },
];

// ----- v0.2 食物判读引擎（mock，AI 风格）-----
export interface FoodAnalysisInput {
  food: FoodItem;
  pet: Pet;
}
export interface FoodAnalysisResult {
  score: number;
  summary: string;
  pros: string[];
  cons: string[];
}

export function analyzeFood(input: FoodAnalysisInput): FoodAnalysisResult {
  const { food, pet } = input;
  let score = 60;
  const pros: string[] = [];
  const cons: string[] = [];

  // 种类匹配
  if (food.forSpecies.includes(pet.species)) {
    score += 10;
    pros.push(`✓ 适用于${pet.species === "cat" ? "猫" : "狗"}`);
  } else {
    score -= 30;
    cons.push(`✗ 不适用于${pet.species === "cat" ? "猫" : "狗"}`);
  }

  // 蛋白质
  if (food.crudeProtein >= 30) {
    score += 10;
    pros.push(`✓ 高蛋白 (${food.crudeProtein}%)，满足肉食动物需求`);
  } else if (food.crudeProtein < 25) {
    score -= 5;
    cons.push(`⚠ 蛋白偏低 (${food.crudeProtein}%)，长期可能影响肌肉`);
  }

  // 谷物
  if (!food.hasGrain) {
    score += 8;
    pros.push(`✓ 无谷配方，降低过敏风险`);
  } else {
    score -= 5;
    cons.push(`⚠ 含谷物，部分宠物可能过敏`);
  }

  // 人工添加剂
  if (!food.hasArtificialAdditive) {
    score += 5;
    pros.push(`✓ 无人工添加剂，更天然`);
  } else {
    cons.push(`⚠ 含人工添加剂（防腐剂/色素）`);
  }

  // 老年宠物
  if (pet.age >= 7 && food.crudeFat > 18) {
    score -= 8;
    cons.push(`⚠ 高脂肪 (${food.crudeFat}%) 不适合老年宠物`);
  }

  // 幼宠
  if (pet.age < 1 && food.lifeStage === "全期") {
    score += 5;
    pros.push(`✓ 全期配方适合幼宠`);
  }

  // 价格（如果太贵/太便宜）
  if (food.pricePerKg > 200) {
    cons.push(`💰 价格偏高 (¥${food.pricePerKg}/kg)`);
  } else if (food.pricePerKg < 40) {
    cons.push(`💰 价格偏低 (¥${food.pricePerKg}/kg)，可能原料一般`);
  }

  // 评分截断
  score = Math.max(0, Math.min(100, score));

  // 总结
  let summary = "";
  if (score >= 85) summary = `非常适合 ${pet.name}，各项指标匹配良好。`;
  else if (score >= 70) summary = `比较适合 ${pet.name}，营养均衡，可长期食用。`;
  else if (score >= 55) summary = `${pet.name} 可以吃，但有更优选择。`;
  else summary = `不太推荐给 ${pet.name}，建议换更适合的配方。`;

  return { score, summary, pros, cons };
}

// ===== v0.3 新增数据 =====

// ----- 成就定义（12 个）-----
export const seedAchievements: Achievement[] = [
  { id: "a1", title: "初来乍到", description: "添加第一只宠物", emoji: "🐾", category: "里程碑", rarity: "common", condition: "add_pet_1" },
  { id: "a2", title: "健康守护者", description: "连续打卡 7 天", emoji: "🛡️", category: "打卡", rarity: "rare", condition: "consecutive_checkin", threshold: 7 },
  { id: "a3", title: "铁人铲屎官", description: "连续打卡 30 天", emoji: "🏆", category: "打卡", rarity: "epic", condition: "consecutive_checkin", threshold: 30 },
  { id: "a4", title: "记录达人", description: "添加 10 条记录", emoji: "📝", category: "记录", rarity: "common", condition: "add_records", threshold: 10 },
  { id: "a5", title: "摄影爱好者", description: "添加 20 张照片", emoji: "📷", category: "记录", rarity: "rare", condition: "add_photos", threshold: 20 },
  { id: "a6", title: "问不倒", description: "AI 问答 20 次", emoji: "💬", category: "问答", rarity: "common", condition: "ask_qa", threshold: 20 },
  { id: "a7", title: "十万个为什么", description: "AI 问答 100 次", emoji: "🤔", category: "问答", rarity: "epic", condition: "ask_qa", threshold: 100 },
  { id: "a8", title: "多宠家长", description: "添加 3 只宠物", emoji: "👨‍👩‍👧‍👦", category: "里程碑", rarity: "rare", condition: "add_pet_n", threshold: 3 },
  { id: "a9", title: "遛狗达人", description: "遛狗 30 次", emoji: "🐕", category: "打卡", rarity: "rare", condition: "add_walks", threshold: 30 },
  { id: "a10", title: "体重管理师", description: "记录体重 10 次", emoji: "⚖️", category: "记录", rarity: "common", condition: "add_weights", threshold: 10 },
  { id: "a11", title: "知识渊博", description: "浏览 50 条小贴士", emoji: "📚", category: "互动", rarity: "common", condition: "view_tips", threshold: 50 },
  { id: "a12", title: "毛球日记传奇", description: "解锁所有其他成就", emoji: "👑", category: "里程碑", rarity: "legendary", condition: "unlock_all" },
];

// ----- 训练课程（6 个）-----
export const seedCourses: Course[] = [
  {
    id: "c1", title: "坐下", category: "基础", difficulty: 1, durationDays: 3,
    forSpecies: ["cat", "dog"], coverEmoji: "🪑",
    summary: "最基础也最实用的指令，3 天学会。",
    steps: [
      { id: "c1s1", title: "准备零食", description: "选一款宠物超爱的小零食，切成黄豆大小，方便快速喂食。", durationMin: 5 },
      { id: "c1s2", title: "引诱姿势", description: "零食靠近宠物鼻子，慢慢向后上方移动，宠物自然坐下。", durationMin: 10, tips: ["手上举别太高，避免跳跃", "每次坐下立刻奖励"] },
      { id: "c1s3", title: "加入口令", description: "宠物坐下瞬间说「坐下」，每天 10 次训练。", durationMin: 10 },
      { id: "c1s4", title: "脱手练习", description: "不拿零食，只用口令，看是否能完成。", durationMin: 10 },
    ],
  },
  {
    id: "c2", title: "便便训练", category: "基础", difficulty: 3, durationDays: 14,
    forSpecies: ["dog"], coverEmoji: "🚽",
    summary: "14 天养成定点排便习惯，关键在坚持。",
    steps: [
      { id: "c2s1", title: "选定点", description: "在阳台或卫生间铺尿垫，作为固定排便点。", durationMin: 10 },
      { id: "c2s2", title: "嗅闻引导", description: "饭后 30 分钟带狗狗到尿垫，闻到气味会自然排便。", durationMin: 15 },
      { id: "c2s3", title: "奖励机制", description: "排便后立刻口头表扬 + 零食奖励。", durationMin: 5, tips: ["不要惩罚乱拉，会适得其反", "保持尿垫清洁"] },
      { id: "c2s4", title: "逐渐收窄", description: "成功率高后逐步缩小尿垫范围。", durationMin: 5 },
      { id: "c2s5", title: "外移训练", description: "从尿垫过渡到户外，巩固习惯。", durationMin: 20 },
    ],
  },
  {
    id: "c3", title: "不咬人", category: "行为", difficulty: 3, durationDays: 10,
    forSpecies: ["cat", "dog"], coverEmoji: "🦷",
    summary: "玩耍性攻击的纠正，关键在用玩具代替手。",
    steps: [
      { id: "c3s1", title: "识别信号", description: "观察扑咬前的征兆（耳朵后压、瞳孔放大、尾巴摆动）。", durationMin: 10 },
      { id: "c3s2", title: "玩具替代", description: "用手逗猫/狗时改用逗猫棒、绳结玩具，绝不用手。", durationMin: 15, tips: ["被咬时立刻停止游戏", "不要打骂"] },
      { id: "c3s3", title: "冷处理", description: "咬人后立刻停止互动 10 分钟，让宠物理解「咬 = 没得玩」。", durationMin: 10 },
      { id: "c3s4", title: "奖励温柔", description: "用嘴轻触手不咬时立刻奖励。", durationMin: 10 },
    ],
  },
  {
    id: "c4", title: "握手", category: "技能", difficulty: 2, durationDays: 5,
    forSpecies: ["cat", "dog"], coverEmoji: "🤝",
    summary: "5 天学会招牌动作，遛弯社交必备。",
    steps: [
      { id: "c4s1", title: "坐姿准备", description: "先用「坐下」让宠物稳定姿态。", durationMin: 5 },
      { id: "c4s2", title: "托爪", description: "轻托前爪，宠物反应不剧烈即可。", durationMin: 10 },
      { id: "c4s3", title: "口令配合", description: "托爪时说「握手」，放下时说「好」。", durationMin: 10 },
      { id: "c4s4", title: "主动伸手", description: "宠物会主动把爪子放到你手上就算成功。", durationMin: 10 },
    ],
  },
  {
    id: "c5", title: "独处不焦虑", category: "行为", difficulty: 4, durationDays: 21,
    forSpecies: ["dog"], coverEmoji: "🏠",
    summary: "上班族必学，21 天缓解分离焦虑。",
    steps: [
      { id: "c5s1", title: "低告别仪式", description: "出门前 30 分钟停止互动，回家也不激动。", durationMin: 30 },
      { id: "c5s2", title: "渐进独处", description: "从 5 分钟开始，逐步延长到 30 分钟、2 小时。", durationMin: 60 },
      { id: "c5s3", title: "KONG 玩具", description: "出门前给 KONG 漏食玩具，分散注意力。", durationMin: 5, tips: ["玩具要冷冻一下更有挑战"] },
      { id: "c5s4", title: "环境丰富", description: "留音乐、留有气味的旧衣服。", durationMin: 10 },
    ],
  },
  {
    id: "c6", title: "翻滚", category: "技能", difficulty: 3, durationDays: 7,
    forSpecies: ["dog"], coverEmoji: "🤸",
    summary: "高难度花式指令，表演赛必备。",
    steps: [
      { id: "c6s1", title: "基础准备", description: "在柔软地面训练，狗狗熟悉环境。", durationMin: 5 },
      { id: "c6s2", title: "侧卧诱导", description: "用零食引诱狗狗躺下、侧卧。", durationMin: 15 },
      { id: "c6s3", title: "翻转动作", description: "零食从背侧绕过头顶，狗狗会自然翻身。", durationMin: 15, tips: ["动作慢，让狗狗跟得上"] },
      { id: "c6s4", title: "口令整合", description: "翻滚时说「翻」，完成后奖励。", durationMin: 15 },
    ],
  },
];

// ----- 每日任务池（10 个，系统每天选 3 个）-----
export const dailyTaskPool: TaskDefinition[] = [
  { id: "t_d1", type: "拍照", title: "今天拍 1 张", description: "记录宠物今天的样子", emoji: "📷", condition: "add_record", xp: 10 },
  { id: "t_d2", type: "打卡", title: "完成 1 次健康打卡", description: "便便/尿尿/精神/食欲任一项", emoji: "💩", condition: "add_healthcheck", xp: 8 },
  { id: "t_d3", type: "打卡", title: "遛狗一次", description: "今天带狗狗出去走走", emoji: "🐕", condition: "add_walk", xp: 10 },
  { id: "t_d4", type: "问答", title: "问问 AI 一个问题", description: "对宠物健康有疑问就问", emoji: "💬", condition: "ask_qa", xp: 6 },
  { id: "t_d5", type: "浏览", title: "看 1 条小贴士", description: "学一点养宠知识", emoji: "📚", condition: "view_updates", xp: 4 },
  { id: "t_d6", type: "训练", title: "训练 1 个步骤", description: "完成任意训练课的一个步骤", emoji: "🎓", condition: "complete_step", xp: 12 },
  { id: "t_d7", type: "分享", title: "分享档案卡", description: "生成一张分享卡给朋友", emoji: "📇", condition: "share_card", xp: 15 },
  { id: "t_d8", type: "互动", title: "跟宠物说说话", description: "用 AI 角色和宠物聊 1 句", emoji: "💝", condition: "ask_qa", xp: 8 },
  { id: "t_d9", type: "互动", title: "记一次体重", description: "关注体重变化", emoji: "⚖️", condition: "add_record", xp: 8 },
  { id: "t_d10", type: "互动", title: "添加提醒", description: "为下次健康事件设提醒", emoji: "⏰", condition: "add_record", xp: 10 },
];

// ----- 宠物年龄 → 人类年龄换算表 -----
// 猫：第 1 年 = 15 岁，之后每年 +4；第 2 年 = 24，之后每年 +4
// 狗（按体型）：小型犬 1y=15, 2y=24, +4；中型 1y=15, 2y=24, +5；大型 1y=14, 2y=22, +6
export interface AgeConversion {
  humanAge: number;
  lifeStage: string;   // 婴儿/青少年/青年/中年/老年
  emoji: string;
  description: string; // 这个阶段的小描述
}

export function convertCatAge(petYears: number, petMonths: number): AgeConversion {
  const months = petYears * 12 + petMonths;
  let humanAge: number;
  if (months < 12) humanAge = Math.round(months * 15 / 12);
  else if (months < 24) humanAge = 15 + Math.round((months - 12) * 9 / 12);
  else humanAge = 24 + Math.floor((months - 24) / 12) * 4;

  let stage: { lifeStage: string; emoji: string; description: string };
  if (humanAge < 2) stage = { lifeStage: "婴儿期", emoji: "👶", description: "需要细心呵护" };
  else if (humanAge < 6) stage = { lifeStage: "幼儿期", emoji: "🧒", description: "好奇心爆棚" };
  else if (humanAge < 11) stage = { lifeStage: "少年期", emoji: "🧑", description: "精力最旺盛" };
  else if (humanAge < 15) stage = { lifeStage: "青年期", emoji: "🧑‍🎓", description: "颜值巅峰" };
  else if (humanAge < 25) stage = { lifeStage: "中年期", emoji: "🧑‍💼", description: "开始稳重" };
  else if (humanAge < 40) stage = { lifeStage: "初老年", emoji: "🧓", description: "需要关注健康" };
  else stage = { lifeStage: "老年期", emoji: "👴", description: "多陪伴多体检" };

  return { humanAge, ...stage };
}

export function convertDogAge(petYears: number, petMonths: number, size: "small" | "medium" | "large" = "medium"): AgeConversion {
  const months = petYears * 12 + petMonths;
  const factor = size === "small" ? 4 : size === "large" ? 6 : 5;
  const firstYear = size === "large" ? 14 : 15;
  const secondYear = size === "large" ? 22 : 24;

  let humanAge: number;
  if (months < 12) humanAge = Math.round(months * firstYear / 12);
  else if (months < 24) humanAge = firstYear + Math.round((months - 12) * (secondYear - firstYear) / 12);
  else humanAge = secondYear + Math.floor((months - 24) / 12) * factor;

  let stage: { lifeStage: string; emoji: string; description: string };
  if (humanAge < 3) stage = { lifeStage: "婴儿期", emoji: "👶", description: "小心呵护" };
  else if (humanAge < 8) stage = { lifeStage: "幼儿期", emoji: "🧒", description: "破坏王" };
  else if (humanAge < 14) stage = { lifeStage: "少年期", emoji: "🧑", description: "学规矩" };
  else if (humanAge < 20) stage = { lifeStage: "青年期", emoji: "🧑‍🎓", description: "最佳状态" };
  else if (humanAge < 30) stage = { lifeStage: "中年期", emoji: "🧑‍💼", description: "性格稳定" };
  else if (humanAge < 45) stage = { lifeStage: "初老年", emoji: "🧓", description: "关节注意" };
  else stage = { lifeStage: "老年期", emoji: "👴", description: "定期体检" };

  return { humanAge, ...stage };
}
