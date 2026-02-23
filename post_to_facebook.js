// post_to_facebook.js
const pageId = process.env.FB_PAGE_ID;
const systemToken = process.env.META_SYSTEM_TOKEN;
const message = process.env.POST_MESSAGE || "RobCo Weather Watch — automated post ✅";

async function main() {
  if (!pageId || !systemToken) {
    throw new Error("Missing FB_PAGE_ID or META_SYSTEM_TOKEN env vars.");
  }

  // 1) Get a Page Access Token (acts as the Page)
  const tokenUrl = `https://graph.facebook.com/v25.0/${pageId}?fields=access_token&access_token=${encodeURIComponent(systemToken)}`;
  const tokenRes = await fetch(tokenUrl);
  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok || tokenJson.error || !tokenJson.access_token) {
    throw new Error("Could not get page access token:\n" + JSON.stringify(tokenJson, null, 2));
  }

  const pageToken = tokenJson.access_token;

  // 2) Publish post to the Page feed
  const body = new URLSearchParams({
    message,
    access_token: pageToken,
  });

  const postRes = await fetch(`https://graph.facebook.com/v25.0/${pageId}/feed`, {
    method: "POST",
    body,
  });
  const postJson = await postRes.json();

  if (!postRes.ok || postJson.error) {
    throw new Error("Post failed:\n" + JSON.stringify(postJson, null, 2));
  }

  console.log("Posted successfully:", postJson.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
