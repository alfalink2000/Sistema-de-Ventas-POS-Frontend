// helpers/fetchSinToken.js - IGUAL A TU EJEMPLO
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const fetchSinToken = (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (method !== "GET" && data) {
    config.body = JSON.stringify(data);
  }

  return fetch(url, config)
    .then(async (response) => {
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || `Error ${response.status}: ${response.statusText}`
          );
        }

        return result;
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${text}`);
        }
        return text;
      }
    })
    .catch((error) => {
      console.error(`Error en fetchSinToken (${method} ${endpoint}):`, error);
      throw error;
    });
};
