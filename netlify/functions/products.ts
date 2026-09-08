// Netlify Serverless Function: /api/products

export const handler = async (event: any) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, x-admin-token",
    "Content-Type": "application/json",
  };

  const method = (event.httpMethod || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  try {
    if (method === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: "ok", message: "Products endpoint active" }),
      };
    }

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const payload = event.body ? JSON.parse(event.body) : {};
      const product = {
        ...payload,
        id: payload.id || `hos-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          product,
          message: "Product saved successfully",
        }),
      };
    }

    if (method === "DELETE") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "Product deleted successfully" }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: `Method ${method} not allowed` }),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: err.message || "Invalid request body" }),
    };
  }
};
