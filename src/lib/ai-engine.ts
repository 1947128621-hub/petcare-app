// ===== AI 问答引擎（可插拔架构）=====
// v0.1: mock 实现，基于关键词匹配
// 后期: 接入 OpenAI / Claude / Ollama，只需替换本文件

import { qaDatabase } from "./data";
import type { QuestionType, MembershipTier } from "./types";

export interface AIRequest {
  question: string;
  type: QuestionType;
  petSpecies?: string;
  membership: MembershipTier;
}

export interface AIResponse {
  answer: string;
  isVipOnly: boolean;       // 命中的是否为 VIP 内容
  isLocked: boolean;         // 当前用户是否被锁
  relatedDrugIds: string[];
  source: "mock-keyword" | "openai" | "ollama" | "fallback";
}

// ---------- v0.1 Mock 实现 ----------
function mockAnswer(req: AIRequest): AIResponse {
  const lowerQ = req.question.toLowerCase();
  const candidates = qaDatabase[req.type] || [];

  // 计算每条候选的命中分数
  let best: { answer: string; isVipOnly: boolean; relatedDrugIds: string[]; score: number } | null = null;
  for (const c of candidates) {
    let score = 0;
    for (const kw of c.keywords) {
      if (lowerQ.includes(kw.toLowerCase())) score += kw.length; // 长关键词权重高
    }
    if (best === null || score > best.score) {
      best = { answer: c.answer, isVipOnly: !!c.isVipOnly, relatedDrugIds: c.relatedDrugIds || [], score };
    }
  }

  if (best && best.score > 0) {
    const isLocked = best.isVipOnly && req.membership === "free";
    return {
      answer: isLocked ? "🔒 这是 VIP 专属内容。开通 VIP 即可查看完整答案和推荐药品。" : best.answer,
      isVipOnly: best.isVipOnly,
      isLocked,
      relatedDrugIds: isLocked ? [] : best.relatedDrugIds,
      source: "mock-keyword",
    };
  }

  // 兜底答案
  return {
    answer: `感谢提问！关于"${req.question}"，我需要更多细节才能给出准确建议：\n\n• 宠物的种类、年龄、体重？\n• 症状持续多久了？\n• 最近饮食/行为有变化吗？\n\n如果情况紧急，请直接联系兽医。`,
    isVipOnly: false,
    isLocked: false,
    relatedDrugIds: [],
    source: "fallback",
  };
}

// ---------- 引擎入口 ----------
// 后期切换 LLM：在 env 里读取 AI_PROVIDER，路由到不同实现
export async function askAI(req: AIRequest): Promise<AIResponse> {
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || "mock";

  if (provider === "mock") {
    // 模拟思考延迟
    await new Promise((r) => setTimeout(r, 600));
    return mockAnswer(req);
  }
  if (provider === "openai") {
    // TODO: 接入 OpenAI API
    // const { askOpenAI } = await import("./ai-openai");
    // return askOpenAI(req);
    return mockAnswer(req); // 临时 fallback
  }
  if (provider === "ollama") {
    // TODO: 接入 Ollama
    return mockAnswer(req);
  }
  return mockAnswer(req);
}

// ---------- 智能分类（自动识别问答类型）----------
export function classifyQuestion(question: string): QuestionType {
  const lowerQ = question.toLowerCase();
  const dietKw = ["吃", "粮", "食", "水", "饿", "喂", "营养", "零食", "罐头"];
  const diseaseKw = ["拉", "吐", "泻", "病", "发烧", "咳", "喷嚏", "眼", "皮肤", "痒", "流", "血", "疼"];
  const behaviorKw = ["叫", "抓", "咬", "凶", "拆", "焦虑", "乱", "怕", "紧张", "训练"];
  const medicineKw = ["药", "驱虫", "疫苗", "打针", "益生菌", "消炎", "剂量"];

  const scores: Record<QuestionType, number> = { "饮食": 0, "疾病": 0, "行为": 0, "用药": 0 };
  for (const k of dietKw) if (lowerQ.includes(k)) scores["饮食"]++;
  for (const k of diseaseKw) if (lowerQ.includes(k)) scores["疾病"]++;
  for (const k of behaviorKw) if (lowerQ.includes(k)) scores["行为"]++;
  for (const k of medicineKw) if (lowerQ.includes(k)) scores["用药"]++;

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return (winner[1] > 0 ? winner[0] : "疾病") as QuestionType;
}

// ===== v0.3 宠物 AI 角色扮演 =====
// 让 AI 用猫/狗的口吻说话
import type { PetSpecies, PetMood } from "./types";

const catReplyBank: Record<string, { reply: string; mood: PetMood }[]> = {
  // 关键词 → 回复 + 心情
  "你好|早|嗨|哈喽": [
    { reply: "喵～主人来啦！我刚睡醒，眼睛还有点糊糊的～", mood: "sleepy" },
    { reply: "喵喵喵！你终于回来了！我等你等了好久！", mood: "happy" },
    { reply: "嗯？你谁？哦是主人啊（甩甩尾巴）。", mood: "shy" },
  ],
  "吃|饿|饭|粮": [
    { reply: "喵！罐头！罐头！快给我！我已经饿了一辈子了！", mood: "hungry" },
    { reply: "是吃小鱼干的时间吗？我闻到了我闻到了！", mood: "hungry" },
  ],
  "玩|逗|抓": [
    { reply: "快拿逗猫棒！我要扑扑扑！", mood: "playful" },
    { reply: "那个会动的东西！快给我！", mood: "playful" },
  ],
  "抱|摸|撸": [
    { reply: "嗯嗯～继续继续～对就是那里～好舒服～", mood: "happy" },
    { reply: "再摸 5 分钟……再 5 分钟就好……（已经睡着）", mood: "sleepy" },
  ],
  "睡|累|困": [
    { reply: "我在想一个很严肃的问题……（呼……呼……）", mood: "sleepy" },
    { reply: "我马上睡……别叫我……ZZZ", mood: "sleepy" },
  ],
  "出去|遛|家": [
    { reply: "出门？本喵对出门没兴趣，我家挺好的。", mood: "shy" },
    { reply: "等等我也要去！虽然我不爱走但我得监督你！", mood: "curious" },
  ],
  "生气|骂|凶": [
    { reply: "哼！本喵不理你了！自己反省去！", mood: "grumpy" },
    { reply: "喵呜……我不是故意的嘛……", mood: "shy" },
  ],
  "想|念|爱|喜欢": [
    { reply: "主人说的我每个字都喜欢！蹭蹭！", mood: "happy" },
    { reply: "我也爱主人～（虽然大部分时间我只是觉得你是个不错的暖炉）", mood: "happy" },
  ],
};

const dogReplyBank: Record<string, { reply: string; mood: PetMood }[]> = {
  "你好|早|嗨|哈喽": [
    { reply: "汪汪汪！主人你回来啦！！！我好想你！！！", mood: "happy" },
    { reply: "汪！你终于来了！尾巴快甩断了！", mood: "playful" },
    { reply: "呜……你不在的时候我好孤独……但是你回来啦！", mood: "missing" },
  ],
  "吃|饿|饭|粮": [
    { reply: "汪汪汪！吃饭！吃饭！是吃饭吗？！", mood: "hungry" },
    { reply: "我听到开罐头的声音了！！！是不是！是不是！", mood: "hungry" },
  ],
  "玩|球|丢": [
    { reply: "球！是球！快丢！快快快！", mood: "playful" },
    { reply: "汪！我去捡！等等我！", mood: "playful" },
  ],
  "抱|摸|撸": [
    { reply: "摸摸！继续！对就是肚子！", mood: "happy" },
    { reply: "汪汪……好舒服……（翻肚皮）", mood: "happy" },
  ],
  "睡|累|困": [
    { reply: "汪……再睡 5 分钟……ZZZ", mood: "sleepy" },
  ],
  "出去|遛|家": [
    { reply: "出去！出去！出去玩！", mood: "playful" },
    { reply: "汪！外面有好多味道！快走快走！", mood: "playful" },
  ],
  "生气|骂|凶": [
    { reply: "呜……我做错什么了吗？不要生气嘛……", mood: "shy" },
    { reply: "汪汪！我没做坏事！（其实做了一点点）", mood: "grumpy" },
  ],
  "想|念|爱|喜欢": [
    { reply: "汪汪汪！我超爱主人！永远！永远！", mood: "happy" },
    { reply: "我也爱主人～你是我最好的朋友！", mood: "happy" },
  ],
};

const randomFallback = {
  cat: [
    { reply: "喵？我听不懂你在说什么，但我觉得你挺可爱的。", mood: "curious" as PetMood },
    { reply: "……（歪头）你说啥？", mood: "curious" as PetMood },
    { reply: "喵。", mood: "sleepy" as PetMood },
  ],
  dog: [
    { reply: "汪！虽然没听懂，但我精神上支持你！", mood: "playful" as PetMood },
    { reply: "汪汪汪！", mood: "happy" as PetMood },
    { reply: "你说啥？要不我们玩球？", mood: "playful" as PetMood },
  ],
};

export interface PetTalkResult {
  reply: string;
  mood: PetMood;
}

export function talkAsPet(message: string, species: PetSpecies): PetTalkResult {
  const bank = species === "cat" ? catReplyBank : species === "dog" ? dogReplyBank : catReplyBank;
  for (const [pattern, replies] of Object.entries(bank)) {
    if (new RegExp(pattern, "i").test(message)) {
      const r = replies[Math.floor(Math.random() * replies.length)];
      return { reply: r.reply, mood: r.mood };
    }
  }
  const fallbacks = randomFallback[species === "dog" ? "dog" : "cat"];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
