const crypto = require("node:crypto");

const getSetting = (name) => {
    if (!process.env[name]) {
        const error = new Error(`${name} is not configured`);
        error.statusCode = 503;
        throw error;
    }
    return process.env[name];
};

const encode = (value) => encodeURIComponent(value)
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

const getOAuthHeader = (method, url) => {
    const oauth = {
        oauth_consumer_key: getSetting("X_API_KEY"),
        oauth_nonce: crypto.randomBytes(16).toString("hex"),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: getSetting("X_ACCESS_TOKEN"),
        oauth_version: "1.0"
    };
    const parameters = Object.entries(oauth)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${encode(key)}=${encode(value)}`)
        .join("&");
    const baseString = [
        method.toUpperCase(),
        encode(url),
        encode(parameters)
    ].join("&");
    const signingKey = `${encode(getSetting("X_API_SECRET"))}&${encode(getSetting("X_ACCESS_TOKEN_SECRET"))}`;
    oauth.oauth_signature = crypto
        .createHmac("sha1", signingKey)
        .update(baseString)
        .digest("base64");

    return `OAuth ${Object.entries(oauth)
        .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
        .join(", ")}`;
};

const publishText = async (text) => {
    if (typeof text !== "string" || !text.trim()) {
        const error = new Error("X post content is empty");
        error.statusCode = 400;
        throw error;
    }
    if (text.length > 280) {
        const error = new Error("X post content must be 280 characters or fewer");
        error.statusCode = 400;
        throw error;
    }
    if (/[\u{1F000}-\u{1FAFF}]/u.test(text)) {
        const error = new Error("X post content must not contain emojis");
        error.statusCode = 400;
        throw error;
    }

    const url = "https://api.x.com/2/tweets";
    const body = { text: text.trim() };
    let response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: getOAuthHeader("POST", url, body),
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
    } catch (error) {
        const networkError = new Error(`X publishing request failed: ${error.message}`);
        networkError.statusCode = 503;
        throw networkError;
    }

    let payload;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }
    if (!response.ok || !payload || !payload.data || !payload.data.id) {
        const apiError = new Error(
            payload && payload.detail
                ? payload.detail
                : "X publishing failed"
        );
        apiError.statusCode = response.status === 429 ? 429 : 502;
        throw apiError;
    }
    return payload.data;
};

module.exports = { publishText };
