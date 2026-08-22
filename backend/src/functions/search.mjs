import { app } from "@azure/functions";

app.http("search", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "search",

  handler: async (request, context) => {
    return {
      status: 200,
      jsonBody: {
        ok: true,
        message: "Azure backend is working"
      }
    };
  }
});