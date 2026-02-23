// post_to_facebook.js
// FB + IG ready.
// Posts FB text (optional).
// Posts FB photo + IG post only if IMAGE_URL exists.

const PAGE_ID = process.env.FB_PAGE_ID;
const SYSTEM_TOKEN = process.env.META_SYSTEM_TOKEN;
const IG_USER_ID = (process.env.IG_USER_ID || "").trim();

const MESSAGE =
  process.env.POST_MESSAGE || "RobCo Weather Watch — automated post ✅";

const IMAGE_URL = (process.env.IMAGE_URL || "").trim();
const FB_TEXT_POST =
  (process.env.FB_TEXT_POST || "true").toLowerCase() === "true";

async function getPageToken() {
  const url = `https://graph.facebook.com/v25.0/${PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(
    SYSTEM_TOKEN
  )}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || json.error || !json.access_token) {
    throw new Error(
      "Failed to get Page token:\n" + JSON.stringify(json, null, 2)
    );
  }

  return json.access_token;
}

async function getIgUserId(pageToken) {
  const url = `https://graph.facebook.com/v25.0/${PAGE_ID}?fields=instagram_business_account&access_token=${encodeURIComponent(
    pageToken
  )}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(
      "Failed to get IG account from Page:\n" +
        JSON.stringify(json, null, 2)
    );
  }

  return json.instagram_business_account?.id || null;
}

async function postTextToFacebook(pageToken) {
  const body = new URLSearchParams({
    message: MESSAGE,
    access_token: pageToken,
  });

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${PAGE_ID}/feed`,
    {
      method: "POST",
      body,
    }
  );

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(
      "FB text post failed:\n" + JSON.stringify(json, null, 2)
    );
  }

  console.log("FB text post OK:", json.id);
}

async function postPhotoToFacebook(pageToken) {
  const body = new URLSearchParams({
    url: IMAGE_URL,
    caption: MESSAGE,
    access_token: pageToken,
  });

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${PAGE_ID}/photos`,
    {
      method: "POST",
      body,
    }
  );

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(
      "FB photo post failed:\n" + JSON.stringify(json, null, 2)
    );
  }

  console.log("FB photo post OK:", json.post_id || json.id);
}

async function postToInstagram(igUserId, pageToken) {
  console.log("Using IG user id:", igUserId);

  // 1️⃣ Create media container
  const createBody = new URLSearchParams({
    image_url: IMAGE_URL,
    caption: MESSAGE,
    access_token: pageToken,
  });

  const createRes = await fetch(
    `https://graph.facebook.com/v25.0/${igUserId}/media`,
    {
      method: "POST",
      body: createBody,
    }
  );

  const createJson = await createRes.json();

  if (!createRes.ok || createJson.error) {
    throw new Error(
      "IG container create failed:\n" +
        JSON.stringify(createJson, null, 2)
    );
  }

  // 2️⃣ Publish container
  const publishBody = new URLSearchParams({
    creation_id: createJson.id,
    access_token: pageToken,
  });

  const pubRes = await fetch(
    `https://graph.facebook.com/v25.0/${igUserId}/media_publish`,
    {
      method: "POST",
      body: publishBody,
    }
  );

  const pubJson = await pubRes.json();

  if (!pubRes.ok || pubJson.error) {
    throw new Error(
      "IG publish failed:\n" + JSON.stringify(pubJson, null, 2)
    );
  }

  console.log("IG publish OK:", pubJson.id);
}

async function main() {
  if (!PAGE_ID || !SYSTEM_TOKEN) {
    throw new Error("Missing FB_PAGE_ID or META_SYSTEM_TOKEN.");
  }

  const pageToken = await getPageToken();

  // Optional FB text post
  if (FB_TEXT_POST) {
    await postTextToFacebook(pageToken);
  } else {
    console.log("FB_TEXT_POST is false: skipping FB text post.");
  }

  // If no IMAGE_URL yet, skip image + IG
  if (!IMAGE_URL) {
    console.log(
      "IMAGE_URL is empty. Skipping FB photo + IG publish (ready for hosting later)."
    );
    return;
  }

  // Post image to Facebook
  await postPhotoToFacebook(pageToken);

  // Determine IG user id (prefer secret override)
  const igUserId = IG_USER_ID || (await getIgUserId(pageToken));

  if (!igUserId) {
    console.log(
      "No instagram_business_account connected to the Page. Skipping IG publish."
    );
    return;
  }

  await postToInstagram(igUserId, pageToken);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
