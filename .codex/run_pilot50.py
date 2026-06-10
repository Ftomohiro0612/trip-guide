import json, re, math
from collections import defaultdict

# 入力ファイル読み込み
with open(r'C:\Users\tomo-\.claude\projects\c--Users-tomo--Documents-Memorip\80d7d2d1-149c-43f0-be91-ce1e35907897\tool-results\mcp-claude_ai_Google_Drive-read_file_content-1781066093576.txt', 'r', encoding='utf-8') as f:
    data = json.load(f)

content = data['fileContent']
lines = content.split('\n')

# ヘッダー行を探す
header_line = None
data_lines = []
for i, line in enumerate(lines):
    if '| id |' in line or '| id\t|' in line:
        header_line = i
    elif header_line is not None and i == header_line + 1:
        continue  # 区切り行スキップ
    elif header_line is not None and line.strip().startswith('|') and line.strip().endswith('|'):
        data_lines.append(line)

# パース
def parse_row(line):
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    return cells

if header_line is not None:
    headers = parse_row(lines[header_line])
else:
    headers = []

rows = []
for line in data_lines:
    cells = parse_row(line)
    if len(cells) >= len(headers):
        row = {}
        for j, h in enumerate(headers):
            row[h] = cells[j] if j < len(cells) else ''
        rows.append(row)

print(f"Total rows: {len(rows)}")
print(f"Headers: {headers}")

# カテゴリ分類
def classify(cat):
    c = cat.lower()
    if any(k in c for k in ['公園', '自然', 'キャンプ', 'ハイキング', '山', '森', '川', '海浜']):
        return 'nature'
    elif any(k in c for k in ['水族館', '海', 'マリン']):
        return 'aquarium'
    elif any(k in c for k in ['動物園', '動物', 'ファーム', '牧場', 'サファリ']):
        return 'zoo'
    elif any(k in c for k in ['遊園地', 'テーマパーク', 'アミューズ']):
        return 'amusement'
    elif any(k in c for k in ['博物館', '科学館', '美術館', '資料館', '天文']):
        return 'museum'
    elif any(k in c for k in ['屋内', 'キッズ', '室内', 'インドア']):
        return 'indoor'
    elif any(k in c for k in ['体験', '農業', '工芸', '工場', 'ものづくり']):
        return 'experience'
    elif any(k in c for k in ['プール', '水遊び', 'じゃぶじゃぶ', '水辺']):
        return 'water'
    else:
        return 'other'

# カテゴリ別グループ
groups = defaultdict(list)
for row in rows:
    cat = row.get('カテゴリ', '')
    g = classify(cat)
    groups[g].append(row)

for g, items in groups.items():
    print(f"{g}: {len(items)}")

# 50件選出（カテゴリ比例）
total = len(rows)
target = 50
selected = []
for g, items in groups.items():
    n = max(1, round(len(items) / total * target))
    selected.extend(items[:n])

selected = selected[:50]
print(f"Selected: {len(selected)}")

# 出力JSON
output = []
for row in selected:
    output.append({
        "id": row.get("id", ""),
        "name": row.get("施設名", ""),
        "prefecture": row.get("県", ""),
        "category": row.get("カテゴリ", ""),
        "age_range": row.get("対象年齢", ""),
        "tags": row.get("tags", ""),
        "signature_experiences": row.get("signature_experiences", ""),
        "experience_tags": row.get("experience_tags", ""),
        "summer_water_play": row.get("summer_water_play", "")
    })

with open(r'C:\Users\tomo-\Documents\Memorip\.codex\pilot50_raw.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Saved to pilot50_raw.json")
print(json.dumps(output[:3], ensure_ascii=False, indent=2))
