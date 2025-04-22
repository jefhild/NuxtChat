// lib/dbUtils.ts
export function getGenderFromId(id: number): string {
  switch (id) {
    case 1:
      return "male";
    case 2:
      return "female";
    default:
      return "other";
  }
}