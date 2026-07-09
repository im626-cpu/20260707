const ADJECTIVES = [
  "배고픈", "든든한", "신속한", "느긋한", "성실한", "유쾌한",
  "조용한", "부지런한", "설레는", "씩씩한", "다정한", "재빠른",
];

const NOUNS = [
  "델리메이트", "라이더", "미식가", "탐험가", "동기", "메이트",
  "이웃", "단골", "손님", "여행자",
];

/** 이메일과 무관한 랜덤 닉네임 생성 (신원 노출 방지) */
export function generateRandomNickname(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${adjective} ${noun}${number}`;
}
