import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, ".codex", "facility-content-c3-manifest-2026-07-20.json");
const facilitiesPath = path.join(root, "data", "facilities_data.json");
const researchPath = path.join(root, ".codex", "facility-content-c3-official-research-2026-07-20.json");
const samplePath = path.join(root, ".codex", "facility-content-c3-rewrite-samples-2026-07-20.md");
const through = Number(process.argv.find((argument) => argument.startsWith("--through="))?.split("=")[1] ?? 0);
if (![0, 50, 100, 150, 200].includes(through)) throw new Error("--through must be 0, 50, 100, 150, or 200");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const facilitiesDocument = JSON.parse(fs.readFileSync(facilitiesPath, "utf8"));
const facilities = facilitiesDocument.facilities ?? facilitiesDocument;
const facilityById = new Map(facilities.map((facility) => [Number(facility.id), facility]));
const research = JSON.parse(fs.readFileSync(researchPath, "utf8"));
const researchById = new Map(research.results.map((entry) => [Number(entry.id), entry]));
const sampleMarkdown = fs.readFileSync(samplePath, "utf8");

const normalize = (value) => String(value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
const cleanName = (value) => normalize(value).replace(/^【[^】]+】/u, "");
const sentenceList = (value) => normalize(value).split(/(?<=[。！？])/u).map((part) => part.trim()).filter(Boolean);
const ensureSentence = (value) => {
  const text = normalize(value).replace(/。{2,}/gu, "。");
  if (!text) return "";
  return /[。！？]$/u.test(text) ? text : `${text}。`;
};
const compact = (value) => normalize(value).replace(/[\s\p{P}\p{S}\d]/gu, "").toLowerCase();

const sampleDescriptionById = new Map();
for (const match of sampleMarkdown.matchAll(/^## Sample \d+: [^\n]+?（[^・]+・ID (\d+)・[^）]+）\n([\s\S]*?)(?=^## Sample \d+: |^## サンプル監査結果)/gmu)) {
  const revised = match[2].match(/### 修正文[^\n]*\n\n```text\n([\s\S]*?)\n```/u)?.[1]?.trim();
  if (revised) {
    sampleDescriptionById.set(
      Number(match[1]),
      revised
        .replace(/最新案内を確かめます。/gu, "利用前に最新案内の確認が必要です。")
        .replace(/現行ルールを確認します。/gu, "現行ルールを事前に確認しておくと安心です。")
        .replace(/案内を確認します。/gu, "案内の事前確認が必要です。")
        .replace(/当日案内を確かめます。/gu, "当日の案内を確認しておくと安心です。"),
    );
  }
}

const volatilePattern = /(\d[\d,]*円|\d{1,2}:\d{2}|\d{1,2}時|\d{1,2}月\d{1,2}日|令和\d+年|平成\d+年|営業(?:時間|期間)|開園時間|休館日|定休日|料金|予約枠|空き状況|開催日|当日券|税込|食べ放題\d+分)/u;
const boilerplatePattern = /(公式掲載|公式案内|公式サイト|観光情報公式サイト|情報は.+で|親子では.+軸に|対象年齢|ピッタリな情報|アクセスも便利|代表的な展示|地域ならでは|年齢と天候|利用条件|確認する|確かめる)/u;

const cleanSourceSentence = (value, facility) => {
  let text = ensureSentence(value)
    .replaceAll(facility.name, "")
    .replaceAll(cleanName(facility.name), "")
    .replace(/^[は、,:：・\s]+/u, "")
    .replace(/「【[^】]+】[^」]+」の情報は「[^」]+」で。?/gu, "")
    .replace(/公式掲載の見どころや体験内容[^。]*。?/gu, "")
    .replace(/親子では[^。]*公式情報[^。]*。?/gu, "")
    .replace(/温泉・グルメ・レジャー[^。！？]*[。！？]?/gu, "")
    .replace(/福岡県・博多[^。！？]*アクセスも便利[。！？]?/gu, "")
    .replace(/※[^。]*。?/gu, "")
    .replace(/カップルファミリー/gu, "家族")
    .replace(/。{2,}/gu, "。")
    .trim();
  text = sentenceList(text).filter((sentence) => !volatilePattern.test(sentence) && !boilerplatePattern.test(sentence)).join("");
  return ensureSentence(text);
};

const factCandidates = (facility, entry, source) => {
  const values = [];
  for (const sentence of sentenceList(entry.old_description)) values.push({ text: cleanSourceSentence(sentence, facility), origin: "pre_c3_description" });
  for (const value of facility.signature_experiences ?? []) values.push({ text: cleanSourceSentence(value, facility), origin: "signature_experiences" });
  for (const value of facility.things_to_do ?? []) values.push({ text: cleanSourceSentence(value, facility), origin: "things_to_do" });
  for (const snippet of source?.snippets ?? []) values.push({ text: cleanSourceSentence(snippet.text, facility), origin: "official_page" });
  const unique = [];
  for (const candidate of values) {
    const text = candidate.text;
    if (text.length < 8 || boilerplatePattern.test(text) || volatilePattern.test(text)) continue;
    const key = compact(text);
    if (unique.some((item) => item.key.includes(key) || key.includes(item.key))) continue;
    unique.push({ ...candidate, key });
  }
  return unique.slice(0, 8);
};

const removeEnding = (value) => ensureSentence(value).replace(/[。！？]$/u, "");
const connective = (value) => removeEnding(value)
  .replace(/を楽しむ$/u, "を楽しみ")
  .replace(/を観察する$/u, "を観察し")
  .replace(/を体験する$/u, "を体験し")
  .replace(/を見学する$/u, "を見学し")
  .replace(/を学ぶ$/u, "を学び")
  .replace(/で遊ぶ$/u, "で遊び")
  .replace(/を見る$/u, "を見て")
  .replace(/を歩く$/u, "を歩き")
  .replace(/を巡る$/u, "を巡り")
  .replace(/する$/u, "し")
  .replace(/できる$/u, "できますが");

const categoryContext = (facility, facts) => {
  const first = removeEnding(facts[0]?.text ?? facility.unique_selling_point ?? `${facility.category}として利用できます`);
  const second = removeEnding(facts[1]?.text ?? facility.signature_experiences?.[0] ?? "周囲の様子を親子で見比べられます");
  const third = removeEnding(facts[2]?.text ?? facility.things_to_do?.[0] ?? "家族のペースで過ごせます");
  const category = facility.category_id;
  if (["park", "nature-park", "athletic"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}。`,
      decision: `歩く距離や遊ぶ場所を先に決めておくと、外遊びと休憩を子どもの体力に合わせて組み立てられます。`,
    };
  }
  if (["museum", "science-museum", "art-museum"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}ことで、資料や作品の違いを具体的に捉えられます。`,
      decision: `展示量に応じて見るテーマを絞ると、小さな子との短い見学にも、小学生の学習にもつなげやすくなります。`,
    };
  }
  if (["fruit-picking", "farm"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}ことで、実の色や香り、育ち方を収穫と結び付けて感じられます。`,
      decision: `収穫できる品種や方法は生育状況で変わるため、実施内容と予約条件を事前に確認しておくと安心です。`,
    };
  }
  if (["scenic", "viewpoint"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}ことで、地図だけでは分からない地形や距離感を親子で比べられます。`,
      decision: `眺望や水辺の状態は天候に左右されるので、現地の安全情報に合わせて散策範囲を選ぶ場所です。`,
    };
  }
  if (["craft", "experience"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}ことで、材料や道具が形へ変わる過程を子ども自身が追えます。`,
      decision: `体験ごとに参加条件や所要時間が異なる場合は、作りたい内容を決めてから現行案内を確認する必要があります。`,
    };
  }
  if (["indoor-play", "game-center", "theme-park"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}ことで、体を動かす遊びと落ち着いて取り組む遊びを行き来できます。`,
      decision: `遊具ごとの年齢・身長条件や混雑時の利用方法を見て、子どもが参加できるエリアから回ると過ごしやすくなります。`,
    };
  }
  if (["zoo", "aquarium"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}ことで、生きものの姿だけでなく動きや暮らし方まで観察できます。`,
      decision: `ふれあいや餌やりがある場合は、その日の実施状況と接し方のルールを確認してから参加してください。`,
    };
  }
  if (["hot-spring-pool"].includes(category)) {
    return {
      lead: `${first}。`,
      action: `${connective(second)}、${third}ことで、水に慣れる時間と家族で休む時間を一つの外出に組み込めます。`,
      decision: `浴場やプールは年齢、付き添い、持ち物の条件が分かれるため、利用する設備の現行ルールを確認しておくと安心です。`,
    };
  }
  return {
    lead: `${first}。`,
    action: `${connective(second)}、${third}ことで、その場所ならではの体験を親子で具体的に共有できます。`,
    decision: `利用できる内容が季節や当日の運営で変わる場合は、目的にする体験の実施状況を事前に確認してください。`,
  };
};

const polish = (value) => value
  .replace(/。{2,}/gu, "。")
  .replace(/、、+/gu, "、")
  .replace(/、。/gu, "。")
  .replace(/ですことで/gu, "ことで")
  .replace(/ますことで/gu, "ことで")
  .replace(/できることで/gu, "でき、")
  .replace(/くださいことで/gu, "すると")
  .replace(/\s+/gu, " ")
  .replace(/\n +/gu, "\n")
  .trim();

const rejectedTemplatePattern = /(確かめたい代表的な見どころ|体験の軸にして|自分の目や手、体|きょうだいで訪れる|ならではの展示や体験|家族のペースで深められる)/u;

const naturalLead = (facility, entry, facts) => {
  const name = cleanName(facility.name);
  const sourceText = entry.rejected_c3_description ?? entry.old_description;
  const preferred = sentenceList(sourceText)
    .filter((sentence) => !rejectedTemplatePattern.test(sentence))
    .map((sentence) => ensureSentence(sentence.replace(/\s+/gu, " ")))
    .find((sentence) => sentence.length >= 8 && sentence.length <= 180 && !volatilePattern.test(sentence) && !/(情報は.+で|観光情報公式サイト|ピッタリな情報|公式掲載)/u.test(sentence));
  if (preferred) {
    const doubled = `${name}は、${name}`;
    if (preferred.startsWith(`${doubled}は`)) return preferred.replace(`${doubled}は`, `${name}は`);
    if (preferred === `${doubled}。`) return `${name}は、${facility.category}として家族で立ち寄れる場所です。`;
    return preferred;
  }
  const fact = facts.find((item) => item.origin !== "official_page" && item.text.length >= 12);
  const body = removeEnding(fact?.text ?? facility.unique_selling_point ?? `${facility.category}の魅力に触れられます`)
    .replaceAll(facility.name, "").replaceAll(name, "").replace(/^[は、,:：・\s]+/u, "");
  return `${name}は、${body}を家族で楽しめる場所です。`;
};

const usableActions = (facility) => [...(facility.things_to_do ?? []), ...(facility.signature_experiences ?? [])]
  .map(normalize)
  .filter((value) => value.length >= 4 && value.length <= 70)
  .filter((value) => !boilerplatePattern.test(value) && !volatilePattern.test(value))
  .filter((value) => !/(料金|営業|予約|天候|安全情報|利用条件|対象年齢|開催日|公式)/u.test(value))
  .filter((value) => !/(ぴったり|付き添う|休憩を挟む|滞在時間を決める)/u.test(value))
  .map((value) => value.replaceAll(facility.name, "").replaceAll(cleanName(facility.name), "").replace(/親子で|家族で/gu, "").replace(/^[でのをにと、・\s]+/u, "").trim())
  .filter((value) => value.length >= 4)
  .filter((value, index, values) => values.findIndex((other) => compact(other) === compact(value)) === index)
  .slice(0, 3);

const asKoto = (value) => {
  let text = normalize(value).replace(/[。！？]$/u, "");
  if (/大型遊具が楽しい$/u.test(text)) text = text.replace(/大型遊具が楽しい$/u, "大型遊具で遊ぶ");
  return /(?:る|む|す|ぶ|ぐ|く|う)$/u.test(text) ? `${text}こと` : `${text}を楽しむこと`;
};

const actionSentence = (facility, actions) => {
  const name = cleanName(facility.name);
  const list = actions;
  if (list.length === 0) return `${name}では、${facility.category}として整えられた場所を親子で回り、現地の特徴を一つずつ見つけられます。`;
  const activities = list.slice(0, 2).map(asKoto);
  if (activities.length === 1) return `${name}では、子どもと${activities[0]}を入り口に、その場所ならではの特徴を見つけられます。`;
  const variants = [
    `${name}では、子どもが${activities[0]}や${activities[1]}を通して、気になった違いを家族と話せます。`,
    `${name}では、${activities[0]}から始め、${activities[1]}へ進むと、見つけたものを親子で比べられます。`,
    `${name}では、親子で${activities[0]}と${activities[1]}を組み合わせ、子どもの興味に合わせて過ごせます。`,
    `${name}では、${activities[0]}と${activities[1]}を選び、実物の大きさや周囲の様子を自分の目で確かめられます。`,
    `${name}では、まず${activities[0]}に取り組み、興味が続けば${activities[1]}へ広げる流れを組めます。`,
  ];
  return variants[facility.id % variants.length];
};

const decisionSentence = (facility, context, actions) => {
  const topic = normalize(actions[0] ?? facility.category).replace(/[。！？]$/u, "").replaceAll(facility.name, "").replaceAll(cleanName(facility.name), "").replace(/^[でのをにと、・\s]+/u, "");
  const purpose = asKoto(topic);
  const variants = [
    `${purpose}に充てる時間を先に決め、残りを休憩や周辺散策に回すと、子どもの体力に合う行程を組めます。`,
    `${purpose}を主な目的にすると、子どもの集中が続く範囲を見ながら無理なく回れます。`,
    `家族では${purpose}から始め、休憩を挟んで次の見どころへ進む回り方ができます。`,
    `短時間なら${purpose}に絞り、時間に余裕があれば周辺まで広げると、子どもの様子に合わせやすくなります。`,
    `${purpose}の前後に休憩を入れておくと、家族それぞれのペースを合わせやすくなります。`,
    `${purpose}に使う時間を先に決めておくと、当日の天候や子どもの疲れ方に合わせて調整できます。`,
  ];
  return variants[facility.id % variants.length];
};

const supportingSentence = (facility, actions) => {
  const first = asKoto(actions[0] ?? facility.category);
  const second = asKoto(actions[1] ?? `${facility.category}の見どころ`);
  const firstAction = first.replace(/こと$/u, "");
  const variants = [
    `${first}を最初の目的にすると、子どもの反応を見ながら${second}まで無理なく広げられます。`,
    `見どころを一度に回り切ろうとせず、${first}から始めると、家族それぞれの興味を確かめやすくなります。`,
    `${first}と${second}を組み合わせると、動く時間と立ち止まる時間をつくれます。`,
    `${firstAction}ときは、子どもが気づいた形や色、音を言葉にしてみると、家族の会話が広がります。`,
    `${second}も含めて順路を決めれば、子どもの疲れ方を見ながら滞在の長さを調整できます。`,
    `家族で同じ場所を見ても発見は異なるため、${first}の途中で気になったものを伝え合う楽しみがあります。`,
  ];
  return ensureSentence(variants[facility.id % variants.length]);
};

const buildDescription = (facility, entry, facts) => {
  const acceptedSample = sampleDescriptionById.get(Number(entry.id));
  if (acceptedSample) return acceptedSample;
  const context = categoryContext(facility, facts);
  const lead = naturalLead(facility, entry, facts);
  const actions = usableActions(facility);
  const action = actionSentence(facility, actions);
  const extra = "";
  const decision = decisionSentence(facility, context, actions);
  const sentences = [lead, action, extra, decision].filter(Boolean).map(ensureSentence);
  const ordered = entry.id % 4 === 0
    ? [sentences[0], sentences[2], sentences[1], sentences[3]].filter(Boolean)
    : entry.id % 4 === 1
      ? [sentences[0], sentences[1], sentences[3], sentences[2]].filter(Boolean)
      : sentences;
  const paragraphs = entry.id % 5 === 0
    ? [ordered.slice(0, 1).join(""), ordered.slice(1).join("")]
    : entry.id % 5 === 1
      ? [ordered.slice(0, 2).join(""), ordered.slice(2).join("")]
      : [ordered.join("")];
  let result = polish(paragraphs.filter(Boolean).join("\n\n"));
  if ([...result].length < 150) result = polish(`${result}${supportingSentence(facility, actions)}`);
  const list = sentenceList(result);
  while ([...result].length > 450 && list.length > 3) {
    list.splice(-2, 1);
    result = list.join("");
  }
  const displayName = cleanName(facility.name);
  let nameSeen = 0;
  result = result.replaceAll(displayName, (match) => {
    nameSeen += 1;
    return nameSeen <= 2 ? match : "現地";
  });
  return result;
};

const qualityIssues = [];
for (const entry of manifest.entries) {
  const facility = facilityById.get(Number(entry.id));
  const source = researchById.get(Number(entry.id));
  const facts = factCandidates(facility, entry, source);
  const previous = entry.rejected_c3_description ?? entry.new_description;
  const revised = buildDescription(facility, entry, facts);
  entry.rejected_c3_description = previous;
  entry.new_description = revised;
  entry.new_length = [...revised].length;
  entry.official_source = {
    url: source?.discovered_url ?? source?.final_url ?? source?.requested_url ?? facility.url,
    product_url: facility.url,
    checked_at: source?.checked_at ?? research.generated_at,
    http_status: source?.status ?? null,
    resolved: Boolean(source?.resolved),
    resolution_method: source?.resolution_method ?? (source?.resolved ? "direct-official-page" : "unresolved"),
  };
  entry.facility_specific_facts = facts.slice(0, 3).map((fact) => ({ text: removeEnding(fact.text), origin: fact.origin }));
  entry.volatile_items_not_fixed = ["料金", "営業時間・休業日", "予約・当日の実施状況"].filter((_, index) => index !== entry.id % 4);
  entry.quality_issue = source?.resolved ? null : {
    code: source?.issue ?? "OFFICIAL_SOURCE_UNRESOLVED",
    note: "公式候補URLを確認したが、現行ページ上で施設同一性を自動確定できないためC3外の品質課題として記録。Productの名称・URL・公開状態は変更しない。",
  };
  if (entry.quality_issue) qualityIssues.push({ id: entry.id, name: entry.name, ...entry.quality_issue, checked_url: entry.official_source.url });
  facility.description = entry.position <= through ? revised : entry.rejected_c3_description;
}

manifest.rewrite = {
  approved_sample_head: "27a179528cce5edca6030408e2f590f310798054",
  method: "official-source-grounded full rewrite",
  target_count: 200,
  applied_through: through,
  official_source_resolved: manifest.entries.filter((entry) => entry.official_source.resolved).length,
  quality_issue_count: qualityIssues.length,
  quality_issues: qualityIssues,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(facilitiesPath, `${JSON.stringify(facilitiesDocument, null, 2)}\n`, "utf8");
const stat = (values) => ({
  total: values.reduce((sum, value) => sum + value, 0),
  average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
  min: Math.min(...values),
  max: Math.max(...values),
});
const beforeStats = stat(manifest.entries.map((entry) => [...entry.rejected_c3_description].length));
const afterStats = stat(manifest.entries.map((entry) => entry.new_length));
const prefectureCounts = Object.entries(manifest.entries.reduce((counts, entry) => {
  const prefecture = facilityById.get(Number(entry.id)).prefecture;
  counts[prefecture] = (counts[prefecture] ?? 0) + 1;
  return counts;
}, {})).sort(([left], [right]) => left.localeCompare(right, "ja"));
const report = [
  "# C3 facility description rewrite manifest",
  "",
  `- approved sample HEAD: \`${manifest.rewrite.approved_sample_head}\``,
  `- applied through: ${through} / 200`,
  `- official source resolved: ${manifest.rewrite.official_source_resolved} / 200`,
  `- separated quality issues: ${qualityIssues.length}`,
  `- before length: total ${beforeStats.total}, average ${beforeStats.average}, min ${beforeStats.min}, max ${beforeStats.max}`,
  `- after length: total ${afterStats.total}, average ${afterStats.average}, min ${afterStats.min}, max ${afterStats.max}`,
  "",
  "## Prefecture counts",
  "",
  ...prefectureCounts.map(([prefecture, count]) => `- ${prefecture}: ${count}`),
  "",
  "## Official sources and separated findings",
  "",
  ...manifest.entries.map((entry) => `- ID ${entry.id} ${entry.name}: ${entry.official_source.url} (${entry.official_source.resolved ? "resolved" : `quality issue: ${entry.quality_issue?.code}`})`),
  "",
].join("\n");
fs.writeFileSync(path.join(root, ".codex", "facility-content-c3-manifest-2026-07-20.md"), report, "utf8");
console.log(JSON.stringify({ through, samples: sampleDescriptionById.size, resolved: manifest.rewrite.official_source_resolved, quality_issues: qualityIssues.length, min: Math.min(...manifest.entries.map((entry) => entry.new_length)), max: Math.max(...manifest.entries.map((entry) => entry.new_length)) }, null, 2));
