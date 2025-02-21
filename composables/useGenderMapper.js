export default function useGenderMapper() {
  const classifyGender = (input) => {
    if (!input) return null; // Handle empty input

    const normalizedInput = input.toLowerCase();
    const words = normalizedInput.split(/\s+/); // Split input into words

    // Check for male-related keywords
    const maleKeywords = ["male", "man", "boy", "guy"];
    if (words.some((word) => maleKeywords.includes(word))) return 1;

    // Check for female-related keywords
    const femaleKeywords = ["female", "woman", "girl", "lady"];
    if (words.some((word) => femaleKeywords.includes(word))) return 2;

    // Default to "Other"
    return 3;
  };

  return { classifyGender };
}
