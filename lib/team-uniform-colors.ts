const namedColors: Record<string, string> = {
  ライトブルー: "#60a5fa",
  スカイブルー: "#38bdf8",
  ネイビーブルー: "#172554",
  ネイビー: "#172554",
  アイボリー: "#fffff0",
  エンジ: "#800020",
  えんじ: "#800020",
  オレンジ: "#f97316",
  ピンク: "#ec4899",
  イエロー: "#eab308",
  グリーン: "#15803d",
  パープル: "#7e22ce",
  ブルー: "#1d4ed8",
  レッド: "#dc2626",
  ブラック: "#171717",
  ホワイト: "#ffffff",
  グレー: "#737373",
  シルバー: "#c0c0c0",
  ゴールド: "#d4af37",
  水色: "#38bdf8",
  紺: "#172554",
  黄緑: "#84cc16",
  深緑: "#14532d",
  緑: "#15803d",
  紫: "#7e22ce",
  茶: "#78350f",
  灰: "#737373",
  銀: "#c0c0c0",
  金: "#d4af37",
  橙: "#f97316",
  黄: "#eab308",
  青: "#1d4ed8",
  赤: "#dc2626",
  白: "#ffffff",
  黒: "#171717",
};

const colorPattern = new RegExp(
  `#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z])|${Object.keys(namedColors).join("|")}`,
  "gi",
);

export function getUniformSwatches(description: string): string[] {
  const matches = description.normalize("NFKC").match(colorPattern) ?? [];
  return [...new Set(matches.map((color) => namedColors[color] ?? color.toLowerCase()))];
}
