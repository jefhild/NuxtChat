export default function useAgeMapper() {
  /**
   * Extract age from a phrase and validate it.
   * @param {string} input - User input phrase like "I am 23 years old".
   * @returns {object} - { valid: boolean, mappedAge: number | null, error: string | null }
   */
  const classifyAge = (input) => {
    if (!input) {
      return { valid: false, mappedAge: null, error: "Age cannot be empty." };
    }

    // Extract numbers from the input using a regular expression
    const numbers = input.match(/\d+/g);
    if (!numbers || numbers.length === 0) {
      return {
        valid: false,
        mappedAge: null,
        error: "Please include a valid age in your response.",
      };
    }

    // Take the first number as the age
    const age = parseInt(numbers[0], 10);

    if (isNaN(age)) {
      return {
        valid: false,
        mappedAge: null,
        error: "Unable to extract a valid age. Please try again.",
      };
    }

    if (age <= 17) {
      return {
        valid: false,
        mappedAge: null,
        error: "You must be at least 18 years old.",
      };
    }

    if (age > 100) {
      return {
        valid: false,
        mappedAge: null,
        error: "Please enter a valid age under 100.",
      };
    }

    return { valid: true, mappedAge: age, error: null };
  };

  return { classifyAge };
}
