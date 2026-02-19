export const config = { runtime: 'edge' };

const PROXY_URL = "https://script.google.com/macros/s/AKfycbzOBVmkFPh90pfSnrNzamHmlVtoVBsJW0lI9Z31sPewtv8eeIZCKBGLE2--TLDvje3Urg/exec";

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const sheet = searchParams.get("sheet");

  if (!sheet) {
    return new Response(JSON.stringify({ error: "sheet param required" }), { status: 400 });
  }

  try {
    const res = await fetch(`${PROXY_URL}?sheet=${sheet}`, { redirect: "follow" });
    const data = await res.text();
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
