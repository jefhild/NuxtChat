import { getAllDynamicRoutesWithMetadata } from "~/composables/useDynamicRoutes";

export default defineEventHandler(async () => {
  try {
    const routes = await getAllDynamicRoutesWithMetadata();

    if (!Array.isArray(routes)) {
      console.error("Expected array of routes with metadata, got:", routes);
      return [];
    }

    return routes;
  } catch (error) {
    console.error("Error generating sitemap URLs:", error);
    return [];
  }
});
