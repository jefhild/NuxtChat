export default function useStatusMapper() {
  const classifyStatus = (input) => {
    if (!input) return null; // Handle empty input

    const normalizedInput = input.toLowerCase();

    // Check for single-related keywords
    const singleKeywords = [
      "single",
      "alone",
      "solo",
      "unmarried",
      "unattached",
    ];
    if (singleKeywords.some((keyword) => normalizedInput.includes(keyword)))
      return 1;

    // Check for married-related keywords
    const marriedKeywords = ["married", "couple", "maried", "husband", "wife", "stable"];
    if (marriedKeywords.some((keyword) => normalizedInput.includes(keyword)))
      return 2;

    const complicatedKeywords = [
      "complicated",
      "complicate",
      "complex",
      "confusing",
    ];

    if (
      complicatedKeywords.some((keyword) => normalizedInput.includes(keyword))
    )
      return 3;

    const seperatedKeywords = [
      "seperated",
      "seperate",
      "divorced",
      "divorce",
      "split",
      "breakup",
    ];

    if (seperatedKeywords.some((keyword) => normalizedInput.includes(keyword)))
      return 4;

    // Default to "Other"
    return 5;
  };

  return { classifyStatus };
}
