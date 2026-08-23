type AgeRange = {
  min: number;
  max: number;
};

export function currentChildAge(
  birthYear: number,
  birthMonth: number,
  referenceDate: string,
): number {
  const year = Number(referenceDate.slice(0, 4));
  const month = Number(referenceDate.slice(5, 7));
  return Math.max(0, year - birthYear - (month < birthMonth ? 1 : 0));
}

function ageRangeFromLabel(label: string | null): AgeRange | null {
  if (!label) return null;
  const normalized = label.replaceAll("才", "歳").replaceAll("−", "-");

  if (
    /どなたでも|全年齢|年齢制限なし|誰でも/u.test(normalized) ||
    /入館者.*どなたでも/u.test(normalized)
  ) {
    return { min: 0, max: Number.POSITIVE_INFINITY };
  }

  if (/^(?:小学生|小学6年生)以下/u.test(normalized)) {
    return { min: 0, max: 12 };
  }
  if (/^中学生以下/u.test(normalized)) {
    return { min: 0, max: 15 };
  }

  let min: number | null = null;
  let max: number | null = null;

  const numericRange = /(\d+)\s*歳?\s*[〜～~-]\s*(\d+)\s*歳/u.exec(
    normalized,
  );
  if (numericRange) {
    min = Number(numericRange[1]);
    max = Number(numericRange[2]);
  }

  const explicitMin = /(\d+)\s*歳\s*(?:以上|から)/u.exec(normalized);
  if (explicitMin) min = Number(explicitMin[1]);

  const openEndedMin = /^(\d+)\s*歳?\s*[〜～~-]/u.exec(normalized);
  if (openEndedMin && min === null) min = Number(openEndedMin[1]);

  const explicitMax = /(\d+)\s*歳\s*(?:まで|以下)/u.exec(normalized);
  if (explicitMax) max = Number(explicitMax[1]);
  const exclusiveMax = /(\d+)\s*歳\s*未満/u.exec(normalized);
  if (exclusiveMax) max = Math.max(0, Number(exclusiveMax[1]) - 1);

  const gradeRange = /小学(?:校)?\s*([1-6])\s*(?:年生?)?\s*[〜～~-]\s*(?:小学(?:校)?\s*)?([1-6])\s*年生/u.exec(
    normalized,
  );
  if (gradeRange) {
    min = Number(gradeRange[1]) + 5;
    max = Number(gradeRange[2]) + 6;
  }

  const gradeMin = /小学(?:校)?\s*([1-6])\s*年生?\s*以上/u.exec(normalized);
  if (gradeMin) min = Number(gradeMin[1]) + 5;

  if (min === null) {
    if (/乳幼児不可/u.test(normalized)) min = 6;
    else if (/^(?:乳幼児|0歳)/u.test(normalized)) min = 0;
    else if (/^(?:未就学児|就学前|幼児)/u.test(normalized)) min = 3;
    else if (/^(?:小学生|小学[1-6]年生)/u.test(normalized)) min = 6;
    else if (/^中学生/u.test(normalized)) min = 12;
  }

  if (max === null) {
    if (/大人|一般/u.test(normalized)) max = Number.POSITIVE_INFINITY;
    else if (/中高生|高校生/u.test(normalized)) max = 18;
    else if (/中学生/u.test(normalized)) max = 15;
    else if (/小学校低学年/u.test(normalized)) max = 9;
    else if (/小学生|小学6年生/u.test(normalized)) max = 12;
    else if (/未就学児|就学前/u.test(normalized)) max = 6;
  }

  if (min === null && max === null) return null;
  if (min !== null && max !== null && min > max) return null;
  return {
    min: min ?? 0,
    max: max ?? Number.POSITIVE_INFINITY,
  };
}

export function getAgeCompatibility(
  ageLabel: string | null,
  age: number,
): boolean | null {
  const range = ageRangeFromLabel(ageLabel);
  if (!range) return null;
  return age >= range.min && age <= range.max;
}
