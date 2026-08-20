(function () {
  "use strict";

  const SIGNAL_FORMULAS = {
    communication: { peacock: 0.35, extraversion: 0.35, agreeableness: 0.30 },
    drive: { tiger: 0.40, conscientiousness: 0.35, emotionalStability: 0.25 },
    judgment: { owl: 0.35, openness: 0.25, conscientiousness: 0.20, emotionalStability: 0.20 },
    collaboration: { agreeableness: 0.40, koala: 0.25, peacock: 0.20, extraversion: 0.15 },
    resilience: { emotionalStability: 0.55, tiger: 0.25, conscientiousness: 0.20 },
    learning: { openness: 0.55, conscientiousness: 0.25, owl: 0.20 },
    logic: { owl: 0.50, conscientiousness: 0.25, openness: 0.15, emotionalStability: 0.10 },
    detail: { owl: 0.45, conscientiousness: 0.40, emotionalStability: 0.15 },
    execution: { conscientiousness: 0.45, tiger: 0.30, emotionalStability: 0.25 },
    creativity: { openness: 0.60, peacock: 0.20, owl: 0.20 },
    responsibility: { conscientiousness: 0.50, owl: 0.25, emotionalStability: 0.25 },
    stability: { emotionalStability: 0.50, conscientiousness: 0.30, koala: 0.20 },
    aesthetic: { openness: 0.50, owl: 0.30, peacock: 0.20 },
    problemLocation: { owl: 0.45, conscientiousness: 0.25, emotionalStability: 0.20, tiger: 0.10 },
    systemDesign: { owl: 0.40, openness: 0.25, conscientiousness: 0.25, tiger: 0.10 },
    patience: { koala: 0.40, conscientiousness: 0.30, emotionalStability: 0.30 },
    performance: { owl: 0.35, conscientiousness: 0.30, tiger: 0.20, openness: 0.15 },
    requirement: { owl: 0.30, agreeableness: 0.25, conscientiousness: 0.25, openness: 0.20 },
    feedback: { agreeableness: 0.30, conscientiousness: 0.25, emotionalStability: 0.25, openness: 0.20 },
    style: { owl: 0.35, openness: 0.35, conscientiousness: 0.30 },
    iteration: { conscientiousness: 0.35, openness: 0.30, emotionalStability: 0.20, owl: 0.15 }
  };

  const JOB_PROFILES = {
    "招聘": {
      reportTitle: "招聘岗位人才画像报告",
      summary: "该岗位强调候选人判断、岗位理解、目标推进和沟通转化，需要在节奏变化中持续协同业务并守住判断质量。",
      abilities: [
        ["沟通表达", "communication", 20], ["目标推进", "drive", 18], ["候选人判断", "judgment", 17],
        ["协同转化", "collaboration", 16], ["抗压稳定", "resilience", 15], ["开放学习", "learning", 14]
      ],
      strengths: ["能把岗位信息转化为清晰表达，并推动候选人与业务方形成有效共识。", "面对目标和变化时具备持续跟进、判断和推进的潜力。"],
      risks: ["需验证其是否能在招聘压力下保持判断标准，而不是只追求速度或数量。", "需确认其对复杂岗位的理解深度，以及沟通承诺后的闭环能力。"],
      interviews: ["请复盘一次难招岗位从需求澄清到候选人转化的完整过程，你如何调整策略？", "业务方与候选人判断冲突时，你如何收集证据并推动决策？", "高峰期同时推进多个职位时，你如何排序优先级并保证候选人体验？"],
      management: "给予清晰招聘目标和业务背景，同时设置过程复盘、候选人质量与沟通体验检查点。"
    },
    "系统策划": {
      reportTitle: "系统策划岗位人才画像报告",
      summary: "该岗位强调系统拆解、规则与数据理解、机制创新和长期迭代，需要把复杂目标转化为可验证、可维护的系统方案。",
      abilities: [
        ["系统拆解", "systemDesign", 22], ["规则与数据", "logic", 20], ["机制创新", "creativity", 18],
        ["长期迭代", "iteration", 16], ["跨职能沟通", "collaboration", 14], ["稳定判断", "judgment", 10]
      ],
      strengths: ["能够从目标、规则、资源和反馈关系中拆解系统，并形成较清晰的机制框架。", "对新机制和版本迭代保持思考，具备连接设计逻辑与用户体验的潜力。"],
      risks: ["需验证其方案是否具备边界条件、数据依据和长期维护思路，避免只停留在概念层。", "需确认其在美术、程序和运营约束下调整方案并完成跨职能共识的能力。"],
      interviews: ["请拆解一个你熟悉的游戏系统，说明目标、循环、资源投放和关键风险。", "一套机制上线后数据偏离预期，你如何判断是规则、数值还是用户理解问题？", "程序评估成本过高时，你如何保留核心体验并调整方案？"],
      management: "用明确目标、约束条件和数据口径驱动方案评审，要求版本后复盘并沉淀可复用的系统设计原则。"
    },
    "执行策划": {
      reportTitle: "执行策划岗位人才画像报告",
      summary: "该岗位强调需求理解、配置执行、文档整理和细节跟进，需要稳定地把策划意图转化为可检查的游戏内容。",
      abilities: [
        ["执行闭环", "execution", 23], ["细节配置", "detail", 20], ["需求理解", "requirement", 17],
        ["沟通协作", "collaboration", 15], ["反馈响应", "feedback", 13], ["稳定输出", "stability", 12]
      ],
      strengths: ["能够把需求拆成具体配置、文档和验收节点，形成持续交付。", "对反馈和细节保持跟进，具备在多人协作中维护信息一致性的潜力。"],
      risks: ["需验证面对频繁调整时是否会遗漏配置、文档或依赖关系。", "需确认其遇到模糊需求时会主动澄清，而不是机械执行或等待指令。"],
      interviews: ["请讲一个你把策划需求落地为配置、文档和验收结果的案例。", "需求在制作中途连续变化时，你如何同步影响范围并避免遗漏？", "发现设计文档与实际效果不一致时，你如何确认标准并推动修正？"],
      management: "提供明确验收标准和版本节点，配套配置检查清单、变更记录与阶段复盘。"
    },
    "AI美术（场景）": {
      reportTitle: "AI美术（场景）岗位人才画像报告",
      summary: "该岗位强调审美判断、AI 工具学习、场景氛围理解和风格统一，需要快速试验并在反馈中稳定迭代。",
      abilities: [
        ["审美与创新", "aesthetic", 24], ["工具学习", "learning", 20], ["风格统一", "style", 17],
        ["需求理解", "requirement", 15], ["细节把控", "detail", 13], ["协作迭代", "feedback", 11]
      ],
      strengths: ["对新工具和视觉方向保持开放，具备快速探索场景方案的潜力。", "能够关注氛围、风格和细节一致性，并通过迭代逐步贴近需求。"],
      risks: ["测评不能直接判断专业审美，需通过作品和现场任务验证视觉质量与风格控制。", "需确认其不是只依赖提示词试错，而能解释构图、光影、材质和后期修正逻辑。"],
      interviews: ["请展示一个 AI 场景从需求分析、提示词测试到后期修正的完整过程。", "生成结果氛围正确但结构和细节不稳定时，你如何定位并修复？", "需要延续既有项目风格时，你如何建立参考、约束和一致性检查？"],
      management: "用视觉基准、可复用工作流和阶段评审管理产出，明确 AI 生成、人工修正与版权合规边界。"
    },
    "场景原画": {
      reportTitle: "场景原画岗位人才画像报告",
      summary: "该岗位强调视觉创造、审美判断、空间与细节表现，需要在项目风格约束下稳定还原场景需求。",
      abilities: [
        ["视觉创造", "creativity", 24], ["审美判断", "aesthetic", 21], ["细节表现", "detail", 16],
        ["风格适配", "style", 15], ["稳定输出", "stability", 13], ["沟通还原", "requirement", 11]
      ],
      strengths: ["具备从主题和氛围出发探索视觉方案的潜力，并能兼顾结构与细节。", "在明确风格基准下，有机会形成稳定的需求还原和持续输出。"],
      risks: ["测评不能替代作品集判断，需重点验证构图、透视、光影、色彩和空间叙事能力。", "需确认其接受反馈和适配项目风格时，能否保持效率与画面质量。"],
      interviews: ["请选一张场景作品，说明构图、动线、光影和氛围如何服务设计目标。", "当个人偏好与项目风格冲突时，你如何分析参考并调整方案？", "时间有限但画面仍有大量细节时，你如何确定优先级并保证完成度？"],
      management: "用清晰美术规范、参考图和分阶段反馈控制方向，同时保留合理的创作探索空间。"
    },
    "游戏测试": {
      reportTitle: "游戏测试岗位人才画像报告",
      summary: "该岗位强调缺陷敏感、逻辑分析、复现追踪和责任闭环，需要耐心验证规则边界并持续推动问题解决。",
      abilities: [
        ["缺陷敏感", "detail", 23], ["责任闭环", "responsibility", 21], ["逻辑分析", "logic", 19],
        ["问题追踪", "problemLocation", 15], ["耐心稳定", "patience", 12], ["规则边界", "judgment", 10]
      ],
      strengths: ["能够关注细节、规则和异常线索，具备形成可复现问题描述的潜力。", "对问题跟踪和结果闭环保持责任感，适合持续验证复杂版本。"],
      risks: ["需验证其是否能从现象继续追查触发条件、影响范围和优先级。", "需确认重复验证和版本压力下仍能保持记录质量与沟通耐心。"],
      interviews: ["请描述一个较隐蔽缺陷从发现、复现、定位线索到关闭的过程。", "面对偶现问题，你会如何设计变量控制和复现步骤？", "开发认为问题优先级不高时，你如何说明影响并推动达成处理结论？"],
      management: "建立用例、缺陷分级和关闭标准，鼓励从单点问题沉淀边界清单与回归策略。"
    },
    "服务端开发": {
      reportTitle: "服务端开发岗位人才画像报告",
      summary: "该岗位强调逻辑严谨、系统设计、数据一致性和线上稳定，需要在高压问题中快速定位并承担结果责任。",
      abilities: [
        ["逻辑严谨", "logic", 23], ["系统设计", "systemDesign", 20], ["稳定责任", "responsibility", 18],
        ["问题定位", "problemLocation", 16], ["抗压响应", "resilience", 13], ["协作交付", "collaboration", 10]
      ],
      strengths: ["具备从接口、数据和依赖关系分析系统问题的潜力，并关注交付稳定性。", "面对复杂问题时倾向于建立结构化判断，适合持续追踪数据一致性和线上风险。"],
      risks: ["需验证高并发、故障恢复、幂等和数据一致性等关键技术能力，测评不能替代编码考核。", "需确认线上压力下能否快速止损、清晰同步并完成复盘，而不是只关注局部技术结论。"],
      interviews: ["请设计一个高并发接口，说明限流、幂等、缓存和数据一致性方案。", "线上出现间歇性超时和数据异常时，你如何分层定位并控制影响？", "请复盘一次服务端事故，你承担了什么、如何止损以及后来如何防止复发？"],
      management: "明确可靠性指标、代码评审和应急机制，通过架构复盘、故障演练和技术债计划提升长期稳定性。"
    },
    "客户端开发": {
      reportTitle: "客户端开发岗位人才画像报告",
      summary: "该岗位强调功能实现、交互落地、性能意识和跨职能协作，需要在设备与版本约束下稳定交付用户体验。",
      abilities: [
        ["功能落地", "execution", 21], ["逻辑与定位", "problemLocation", 19], ["性能意识", "performance", 17],
        ["学习能力", "learning", 16], ["协作沟通", "collaboration", 14], ["稳定交付", "stability", 13]
      ],
      strengths: ["能够把需求转化为可运行功能，并关注问题定位和交付闭环。", "对新技术与跨端约束保持学习，具备连接策划、美术和服务端的协作潜力。"],
      risks: ["需通过编码和项目案例验证架构、性能、内存及设备适配能力。", "需确认需求变化和联调压力下，仍能管理依赖、及时同步并保证版本质量。"],
      interviews: ["请复盘一个客户端功能从需求、架构到上线的过程，你解决了哪些交互或性能问题？", "出现只在部分设备复现的卡顿或崩溃时，你如何收集信息并定位？", "策划效果、美术资源和服务端接口同时变化时，你如何管理依赖并保证交付？"],
      management: "设置功能验收、性能预算和设备覆盖标准，强化代码评审、联调清单与线上质量复盘。"
    },
    "通用游戏公司岗位": {
      reportTitle: "通用游戏公司岗位人才画像报告",
      summary: "当前应聘岗位为空或不在岗位画像列表中，报告按通用游戏项目协作、学习、执行和稳定交付要求进行评估。",
      abilities: [
        ["目标执行", "execution", 18], ["逻辑判断", "judgment", 18], ["协作沟通", "collaboration", 17],
        ["开放学习", "learning", 17], ["责任闭环", "responsibility", 16], ["稳定适应", "stability", 14]
      ],
      strengths: ["在目标、协作和学习之间具备可迁移的工作潜力。", "能够结合规则与反馈推进任务，适合通过实际项目进一步验证。"],
      risks: ["由于岗位未匹配到专属画像，当前适配度只能作为通用参考。", "需要结合具体岗位职责、作品或专业任务验证能力边界。"],
      interviews: ["请复盘一个你从模糊需求到完成交付的项目，说明你的判断和行动。", "遇到跨角色分歧时，你如何获取信息、同步风险并推进结论？", "请讲一次快速学习新工具或新领域并实际产出结果的经历。"],
      management: "先明确岗位职责和成功标准，再通过短周期任务验证学习、协作、执行与复盘能力。"
    }
  };

  function clamp(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback;
  }

  function normalizeRole(value) {
    const role = String(value || "").replace(/\s+/g, "");
    if (/AI美术.*场景|场景.*AI美术/i.test(role)) return "AI美术（场景）";
    if (role.includes("场景原画")) return "场景原画";
    if (role.includes("服务端") || role.includes("后端开发")) return "服务端开发";
    if (role.includes("客户端") || role.includes("前端开发")) return "客户端开发";
    if (role.includes("系统策划")) return "系统策划";
    if (role.includes("执行策划")) return "执行策划";
    if (role.includes("游戏测试") || role === "测试" || role.includes("测试工程")) return "游戏测试";
    if (role.includes("招聘")) return "招聘";
    return "通用游戏公司岗位";
  }

  function reportSignals(result) {
    const questionCount = Math.max(20, Number(result?.questionCount || 50));
    const inferredChoiceCount = Math.max(1, questionCount - 20);
    const traitKeys = ["tiger", "peacock", "koala", "owl"];
    const signals = {};
    traitKeys.forEach(key => {
      const fallbackMax = Number(result?.traitMax?.[key]) || inferredChoiceCount;
      const derived = fallbackMax ? Number(result?.traits?.[key] || 0) / fallbackMax * 100 : 50;
      signals[key] = clamp(result?.traitPercent?.[key], clamp(derived, 50));
    });
    ["extraversion", "agreeableness", "conscientiousness", "emotionalStability", "openness"].forEach(key => {
      const max = Number(result?.bigFiveMax?.[key]) || 20;
      const derived = max ? Number(result?.bigFive?.[key] || 0) / max * 100 : 50;
      signals[key] = clamp(result?.bigFivePercent?.[key], clamp(derived, 50));
    });
    return signals;
  }

  function scoreFormula(formula, signals) {
    return Math.round(Object.entries(formula).reduce((sum, [key, weight]) => sum + signals[key] * weight, 0));
  }

  function fitLevel(score) {
    if (score >= 80) return "高适配";
    if (score >= 65) return "较适配";
    if (score >= 50) return "需验证";
    return "谨慎匹配";
  }

  function build(result, roleValue) {
    const roleName = normalizeRole(roleValue);
    const profile = JOB_PROFILES[roleName];
    const signals = reportSignals(result || {});
    const abilities = profile.abilities.map(([label, formulaKey, weight]) => ({
      label,
      formulaKey,
      weight,
      score: scoreFormula(SIGNAL_FORMULAS[formulaKey], signals)
    }));
    const fit = Math.round(abilities.reduce((sum, ability) => sum + ability.score * ability.weight / 100, 0));
    const ranked = [...abilities].sort((a, b) => b.score - a.score);
    const top = ranked.slice(0, 2);
    const low = ranked.slice(-2).reverse();
    const level = fitLevel(fit);
    const summary = `${profile.summary} 当前适配度为 ${fit}%（${level}），${top.map(item => item.label).join("、")}相对突出；${low.map(item => item.label).join("、")}建议结合项目经历重点验证。`;
    const advantages = top.map((item, index) => `${item.label} ${item.score}%：${profile.strengths[index]}`);
    const risks = low.map((item, index) => `${item.label} ${item.score}%：${profile.risks[index]}`);
    const management = `${profile.management} 当前建议优先关注${low.map(item => item.label).join("和")}。`;
    return {
      roleName,
      reportTitle: profile.reportTitle,
      isGeneral: roleName === "通用游戏公司岗位",
      fit,
      fitLevel: level,
      abilities,
      summary,
      advantages,
      risks,
      interviews: [...profile.interviews],
      management
    };
  }

  function dimensionAdvice(report, dimensionName, percent) {
    const level = percent >= 75 ? "较高" : percent >= 55 ? "中等" : "较低";
    const focus = report.abilities.slice(0, 2).map(item => item.label).join("、");
    return `该维度当前为${level}水平。在${report.roleName}中，需结合${focus}相关项目案例判断其实际表现。`;
  }

  window.LingxiangJobReports = { build, dimensionAdvice, profiles: JOB_PROFILES };
})();
