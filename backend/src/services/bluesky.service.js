const { AtpAgent } = require("@atproto/api");

const BLUESKY_CHAR_LIMIT = 300;
const BLUESKY_MAX_IMAGES = 4;
const BLUESKY_MAX_IMAGE_BYTES = 2000000;
const BLUESKY_ALT_MAX_LENGTH = 2000;
const SUPPORTED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
]);

const getSetting = (name) => {
    if (!process.env[name]) {
        const error = new Error(`${name} is not configured`);
        error.statusCode = 503;
        throw error;
    }
    return process.env[name];
};

const toHttpError = (error, fallback) => {
    // 429 is surfaced as-is so the admin can retry; every other upstream
    // failure is reported as a bad gateway from Bluesky's side.
    const statusCode = error.status === 429 ? 429 : 502;
    return Object.assign(new Error(`${fallback}: ${error.message || "Unknown Bluesky error"}`), {
        statusCode
    });
};

/**
 * Creates a short-lived authenticated agent using the configured app
 * password. The session is never persisted: every publish re-authenticates
 * with BLUESKY_HANDLE / BLUESKY_APP_PASSWORD.
 */
const createAgent = async () => {
    const identifier = getSetting("BLUESKY_HANDLE");
    const password = getSetting("BLUESKY_APP_PASSWORD");
    const service = process.env.BLUESKY_SERVICE || "https://bsky.social";
    const agent = new AtpAgent({ service });

    try {
        await agent.login({ identifier, password });
    } catch (error) {
        throw toHttpError(error, "Bluesky authentication failed");
    }

    return { agent, identifier };
};

const downloadImage = async (imageUrl) => {
    let response;
    try {
        response = await fetch(imageUrl);
    } catch (error) {
        const requestError = new Error(`Unable to download Bluesky image: ${error.message}`);
        requestError.statusCode = 422;
        throw requestError;
    }
    if (!response.ok) {
        const error = new Error(`Unable to download Bluesky image (HTTP ${response.status})`);
        error.statusCode = 422;
        throw error;
    }

    const contentType = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
        const error = new Error(`Bluesky images must be JPEG, PNG, GIF, or WebP (received ${contentType || "unknown"})`);
        error.statusCode = 422;
        throw error;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
        const error = new Error("Bluesky image is empty");
        error.statusCode = 422;
        throw error;
    }
    if (bytes.byteLength > BLUESKY_MAX_IMAGE_BYTES) {
        const error = new Error(`Bluesky images must be 2 MB or smaller (received ${Math.round(bytes.byteLength / 1024)} KB)`);
        error.statusCode = 422;
        throw error;
    }

    return { bytes, contentType };
};

/**
 * The XRPC client resolves with an XRPCResponse wrapper whose payload sits on
 * `data`. Older SDK builds returned the payload directly, so accept both.
 */
const unwrap = (response) => (response && typeof response === "object" && "data" in response
    ? response.data
    : response);

/**
 * Downloads an image from Cloudinary and uploads the raw bytes to Bluesky as
 * a blob, returning the image embed object used in a post record.
 */
const uploadImage = async (agent, imageUrl, altText) => {
    const { bytes, contentType } = await downloadImage(imageUrl);
    let blob;
    try {
        blob = unwrap(await agent.uploadBlob(bytes, { encoding: contentType }))?.blob;
    } catch (error) {
        throw toHttpError(error, "Bluesky image upload failed");
    }
    if (!blob) {
        const error = new Error("Bluesky image upload did not return a blob");
        error.statusCode = 502;
        throw error;
    }

    // `alt` is required by the lexicon even when the admin supplied none, so it
    // is always sent (an empty string is valid) rather than omitted.
    return {
        image: blob,
        alt: typeof altText === "string" ? altText.trim() : ""
    };
};

const getRkey = (uri) => {
    const segments = String(uri || "").split("/");
    return segments[segments.length - 1] || "";
};

const buildPostUrl = (identifier, uri) => {
    const rkey = getRkey(uri);
    if (!identifier || !rkey) {
        return null;
    }
    return `https://bsky.app/profile/${identifier}/post/${rkey}`;
};

/**
 * Publishes a post to Bluesky. Callers are responsible for having already
 * reviewed and saved the draft; this function never mutates stored data.
 */
const publishPost = async (text, images = []) => {
    if (typeof text !== "string" || !text.trim()) {
        const error = new Error("Bluesky post content is empty");
        error.statusCode = 400;
        throw error;
    }
    if (text.length > BLUESKY_CHAR_LIMIT) {
        const error = new Error(`Bluesky post content must be ${BLUESKY_CHAR_LIMIT} characters or fewer`);
        error.statusCode = 400;
        throw error;
    }
    if (/[\u{1F000}-\u{1FAFF}]/u.test(text)) {
        const error = new Error("Bluesky post content must not contain emojis");
        error.statusCode = 400;
        throw error;
    }
    if (images.length > BLUESKY_MAX_IMAGES) {
        const error = new Error(`A Bluesky post can carry at most ${BLUESKY_MAX_IMAGES} images`);
        error.statusCode = 400;
        throw error;
    }

    const { agent, identifier } = await createAgent();
    const embedded = [];
    for (const item of images) {
        embedded.push(await uploadImage(agent, item.url, item.alt));
    }

    let created;
    try {
        created = unwrap(await agent.post({
            text: text.trim(),
            createdAt: new Date().toISOString(),
            // `embed` is a lexicon union, so it must carry its own $type.
            ...(embedded.length
                ? { embed: { $type: "app.bsky.embed.images", images: embedded } }
                : {})
        }));
    } catch (error) {
        throw toHttpError(error, "Bluesky publishing failed");
    }
    if (!created || !created.uri) {
        const error = new Error("Bluesky publishing did not return a post URI");
        error.statusCode = 502;
        throw error;
    }

    return {
        uri: created.uri,
        cid: created.cid || null,
        url: buildPostUrl(identifier, created.uri)
    };
};

module.exports = {
    BLUESKY_CHAR_LIMIT,
    BLUESKY_MAX_IMAGES,
    BLUESKY_MAX_IMAGE_BYTES,
    BLUESKY_ALT_MAX_LENGTH,
    SUPPORTED_IMAGE_TYPES,
    publishPost
};
