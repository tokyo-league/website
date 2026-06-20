export const contactTypes = {
  membership: "加盟に関するお問い合わせ",
  participation: "試合参加に関するお問い合わせ",
  other: "その他のお問い合わせ",
} as const;

export type ContactType = keyof typeof contactTypes;
