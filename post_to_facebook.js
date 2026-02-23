// post_to_facebook.js
// FB + IG ready. Posts to FB feed (text) always (optional),
// posts photo to FB and publishes to IG only if IMAGE_URL is provided.

const PAGE_ID = process.env.FB_PAGE_ID;
const SYSTEM_TOKEN = process.env.META_SYSTEM_TOKEN;

const MESSAGE = process.env.POST_MESSAGE || "RobCo Weather Watch — automated post ✅";
const IMAGE_URL = (process.env.IMAGE_URL || "").trim(); // leave blank for now
const FB_TEXT_POST = (process.env.FB_TEXT_POST || "true").toLowerCase() === "true"; // default true

async function getPageToken() {
  const url = `https://graph.facebook.com/v25.0/${PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(
    SYSTEM_TOKEN
  )}`;

  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error || !json.access_token) {
    throw new Error("Failed to get Page token:\n" + JSON.stringify(json, null, 2));
  }
  return json.access_token;
}

async function getIgUserId(pageToken) {
  // This returns the Instagram business/creator account connected to the Page.
  const url = `https://graph.facebook.com/v25.0/${PAGE_ID}?fields=instagram_business_account&access_token=${encodeURIComponent(
    pageToken
  )}`;

  const res = await fetch(url);
  const json = await res.json();

  // If not connected, json.instagram_business_account may be missing.
  if (!res.ok || json.error) {
    throw new Error("Failed to get IG account from Page:\n" + JSON.stringify(json, null, 2));
  }

  return json.instagram_business_account?.id || null;
}

async function postTextToFacebook(pageToken) {
  const body = new URLSearchParams({
    message: MESSAGE,
    access_token: pageToken,
  });

  const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/feed`, {
    method: "POST",
    body,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error("FB text post failed:\n" + JSON.stringify(json, null, 2));
  }
  console.log("FB text post OK:", json.id);
}

async function postPhotoToFacebook(pageToken) {
  const body = new URLSearchParams({
    url: IMAGE_URL,
    caption: MESSAGE,
    access_token: pageToken,
  });

  const res = await fetch(`https://graph.facebook.com/v25.0/${PAGE_ID}/photos`, {
    method: "POST",
    body,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error("FB photo post failed:\n" + JSON.stringify(json, null, 2));
  }
  console.log("FB photo post OK:", json.post_id || json.id);
}

async function postToInstagram(igUserId, pageToken) {
  // 1) Create media container
  const createBody = new URLSearchParams({
    image_url: IMAGE_URL,
    caption: MESSAGE,
    access_token: pageToken,
  });

  const createRes = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media`, {
    method: "POST",
    body: createBody,
  });
  const createJson = await createRes.json();
  if (!createRes.ok || createJson.error) {
    throw new Error("IG container create failed:\n" + JSON.stringify(createJson, null, 2));
  }

  // 2) Publish
  const publishBody = new URLSearchParams({
    creation_id: createJson.id,
    access_token: pageToken,
  });

  const pubRes = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media_publish`, {
    method: "POST",
    body: publishBody,
  });
  const pubJson = await pubRes.json();
  if (!pubRes.ok || pubJson.error) {
    throw new Error("IG publish failed:\n" + JSON.stringify(pubJson, null, 2));
  }

  console.log("IG publish OK:", pubJson.id);
}

async function main() {
  if (!PAGE_ID || !SYSTEM_TOKEN) {
    throw new Error("Missing FB_PAGE_ID or META_SYSTEM_TOKEN.");
  }

  const pageToken = await getPageToken();

  // Optional: text-only FB post (works even without hosting)
  if (FB_TEXT_POST) {
    await postTextToFacebook(pageToken);
  } else {
    console.log("FB_TEXT_POST is false: skipping FB text post.");
  }

  // Image-based posting (requires public IMAGE_URL)
  if (!IMAGE_URL) {
    console.log("IMAGE_URL is empty. Skipping FB photo + IG publish (ready for hosting later).");
    return;
  }

  // FB photo
  await postPhotoToFacebook(pageToken);

  // IG publish
  const igUserId = await getIgUserId(pageToken);
  if (!igUserId) {
    console.log("No instagram_business_account connected to the Page. Skipping IG publish.");
    return;
  }

  await postToInstagram(igUserId, pageToken);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
