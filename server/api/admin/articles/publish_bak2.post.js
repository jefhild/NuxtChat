export default defineEventHandler(async (event) => {
  return { success: true, echo: "publish route alive" };
});
