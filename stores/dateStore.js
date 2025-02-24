import { defineStore } from "pinia";

export const useDateStore = defineStore("date", {
  state: () => {
    // Get the current date
    const now = new Date();

    // Calculate tomorrow's date
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    // Calculate 7 days before tomorrow
    const sevenDaysAgo = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate() - 7
    );

    return {
      startDate: sevenDaysAgo,
      endDate: tomorrow,
    };
  },
  getters: {
    getStartDate(state) {
      return state.startDate.toISOString().split("T")[0]; // format as 'YYYY-MM-DD'
    },
    getEndDate(state) {
      return state.endDate.toISOString().split("T")[0]; // format as 'YYYY-MM-DD'
    },
  },
  actions: {
    setDates(startDate, endDate) {
      this.startDate = new Date(startDate);
      this.endDate = new Date(endDate);
    },
  },
});
