const fs = require("node:fs");
const fsp = require("node:fs/promises");
const crypto = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { promisify } = require("node:util");

const Groq = require("groq-sdk");
const { toFile } = require("groq-sdk");
const { PDFParse } = require("pdf-parse");

const execFileAsync = promisify(execFile);
const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
const GROQ_STT_MODEL = "whisper-large-v3";
const AUDIO_CHUNK_SECONDS = 600;
const EXPEDITION_SOURCE_MAX_CHARS = 16000;
const EXPEDITION_RESOURCE_TEXT_MAX_CHARS = 2500;

const getRequiredSetting = (name) => {
    if (!process.env[name]) {
        throw new Error(`${name} is not configured`);
    }

    return process.env[name];
};

const extractDocumentContent = async (fileUrl) => {
    let parser;

    try {
        parser = new PDFParse({ url: fileUrl });
        const response = await parser.getText();
        const extractedText = (response.text || "").trim();

        if (!extractedText) {
            const error = new Error("The PDF does not contain selectable text");
            error.code = "EMPTY_DOCUMENT_TEXT";
            error.statusCode = 422;
            throw error;
        }

        return extractedText;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        const extractionError = new Error(`Unable to extract text from the PDF: ${error.message}`);
        extractionError.code = "PDF_EXTRACTION_FAILED";
        extractionError.statusCode = 422;
        throw extractionError;
    } finally {
        if (parser) {
            await parser.destroy();
        }
    }
};

const parseGeneratedContent = (content) => {
    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error("Groq returned invalid structured content");
    }
};

const generateContent = async (
    sourceContent,
    resource,
    { generateWebsiteArticle = false, generateLinkedInPost = false } = {}
) => {
    const groq = new Groq({
        apiKey: getRequiredSetting("GROQ_API_KEY")
    });
    const requestedOutputs = [
        "summary",
        "simplifiedExplanation",
        "suggestedMetadata"
    ];

    if (generateWebsiteArticle) {
        requestedOutputs.push("websiteArticleDraft");
    }

    if (generateLinkedInPost) {
        requestedOutputs.push("linkedInPostDraft");
    }

    const response = await groq.chat.completions.create({
        model: process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: [
                    "Generate content from the supplied source text only.",
                    "Do not use or infer evidence from photographs, figures, or other images.",
                    "Use only information explicitly supported by the source material.",
                    "Do not invent statistics, scientific findings, outcomes, or claims.",
                    "Preserve uncertainty and inconsistencies in the source rather than resolving them yourself.",
                    "Do not infer the total number of unique projects by adding seasonal counts.",
                    "If information is unavailable, omit it.",
                    "When websiteArticleDraft is requested, make it a detailed, substantially longer article while staying fully grounded in the source.",
                    `Return JSON with exactly these keys: ${requestedOutputs.join(", ")}.`,
                    "suggestedMetadata must be an object containing tags and any useful report metadata.",
                    "Do not include content for outputs that are not listed."
                ].join(" ")
            },
            {
                role: "user",
                content: JSON.stringify({
                    resource: {
                        title: resource.title,
                        description: resource.description,
                        type: resource.type,
                        category: resource.category
                    },
                    sourceText: sourceContent
                })
            }
        ]
    });

    const generatedContent = parseGeneratedContent(response.choices[0].message.content);

    if (
        !generatedContent.summary
        || !generatedContent.simplifiedExplanation
        || !generatedContent.suggestedMetadata
        || typeof generatedContent.suggestedMetadata !== "object"
    ) {
        const error = new Error("Groq returned incomplete required AI content");
        error.statusCode = 502;
        throw error;
    }

    if (
        (generateWebsiteArticle && !generatedContent.websiteArticleDraft)
        || (generateLinkedInPost && !generatedContent.linkedInPostDraft)
    ) {
        const error = new Error("Groq did not return all requested AI content");
        error.statusCode = 502;
        throw error;
    }

    return {
        summary: generatedContent.summary,
        simplifiedExplanation: generatedContent.simplifiedExplanation,
        suggestedMetadata: generatedContent.suggestedMetadata,
        websiteArticleDraft: generateWebsiteArticle
            ? generatedContent.websiteArticleDraft
            : null,
        linkedInPostDraft: generateLinkedInPost
            ? generatedContent.linkedInPostDraft
            : null
    };
};

const generateDocumentContent = async (resource, options = {}) => {
    const extractedDocumentContent = await extractDocumentContent(resource.fileUrl);
    const generatedContent = await generateContent(extractedDocumentContent, resource, options);

    return {
        extractedDocumentContent,
        ...generatedContent,
        documentExtractionMethod: "pdf-parse",
        generationModel: process.env.GROQ_TEXT_MODEL || GROQ_TEXT_MODEL,
        sourceMediaType: "pdf"
    };
};

const downloadSourceVideo = async (fileUrl, outputPath) => {
    let response;

    try {
        response = await fetch(fileUrl);
    } catch (error) {
        const downloadError = new Error(`Unable to download the video: ${error.message}`);
        downloadError.code = "VIDEO_DOWNLOAD_FAILED";
        downloadError.statusCode = 422;
        throw downloadError;
    }

    if (!response.ok || !response.body) {
        const downloadError = new Error(`Unable to download the video (HTTP ${response.status})`);
        downloadError.code = "VIDEO_DOWNLOAD_FAILED";
        downloadError.statusCode = 422;
        throw downloadError;
    }

    try {
        await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(outputPath));
    } catch (error) {
        const downloadError = new Error(`Unable to save the video: ${error.message}`);
        downloadError.code = "VIDEO_DOWNLOAD_FAILED";
        downloadError.statusCode = 422;
        throw downloadError;
    }
};

const extractAudioChunks = async (videoPath, outputDirectory) => {
    const chunkPattern = path.join(outputDirectory, "audio-%03d.mp3");

    try {
        await execFileAsync("ffmpeg", [
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            videoPath,
            "-map",
            "0:a:0",
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "64k",
            "-f",
            "segment",
            "-segment_time",
            String(AUDIO_CHUNK_SECONDS),
            "-reset_timestamps",
            "1",
            chunkPattern
        ]);
    } catch (error) {
        const details = (error.stderr || "").trim();
        const lowerDetails = details.toLowerCase();
        const extractionError = new Error(
            lowerDetails.includes("does not contain any stream")
                || lowerDetails.includes("does not contain an audio stream")
                || lowerDetails.includes("matches no streams")
                ? "The video does not contain an audio track"
                : `Unable to extract audio from the video${details ? `: ${details}` : ""}`
        );
        extractionError.code = "AUDIO_EXTRACTION_FAILED";
        extractionError.statusCode = 422;
        throw extractionError;
    }

    const chunks = (await fsp.readdir(outputDirectory))
        .filter((fileName) => fileName.startsWith("audio-") && fileName.endsWith(".mp3"))
        .sort()
        .map((fileName) => path.join(outputDirectory, fileName));

    if (!chunks.length) {
        const error = new Error("The video does not contain an audio track");
        error.code = "AUDIO_EXTRACTION_FAILED";
        error.statusCode = 422;
        throw error;
    }

    return chunks;
};

const transcribeAudioChunks = async (audioChunks) => {
    const groq = new Groq({
        apiKey: getRequiredSetting("GROQ_API_KEY")
    });
    const model = process.env.GROQ_STT_MODEL || GROQ_STT_MODEL;
    const transcriptParts = [];

    for (const audioChunk of audioChunks) {
        try {
            const audioFile = await toFile(
                fs.createReadStream(audioChunk),
                path.basename(audioChunk),
                { type: "audio/mpeg" }
            );
            const response = await groq.audio.transcriptions.create({
                file: audioFile,
                model,
                response_format: "text",
                temperature: 0
            });
            const text = (typeof response === "string" ? response : response.text || "").trim();
            if (text) {
                transcriptParts.push(text);
            }
        } catch (error) {
            const transcriptionError = new Error(`Groq transcription failed: ${error.message}`);
            transcriptionError.code = "GROQ_TRANSCRIPTION_FAILED";
            transcriptionError.statusCode = 502;
            throw transcriptionError;
        }
    }

    const transcript = transcriptParts.join("\n\n").trim();
    if (!transcript) {
        const error = new Error("The video audio produced an empty transcript");
        error.code = "EMPTY_TRANSCRIPT";
        error.statusCode = 422;
        throw error;
    }

    return {
        transcript,
        transcriptionModel: model
    };
};

const generateVideoContent = async (resource, options = {}) => {
    const temporaryDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), "cryoverse-video-"));
    const videoPath = path.join(temporaryDirectory, "source-video");

    try {
        await downloadSourceVideo(resource.fileUrl, videoPath);
        const audioChunks = await extractAudioChunks(videoPath, temporaryDirectory);
        const transcription = await transcribeAudioChunks(audioChunks);
        const generatedContent = await generateContent(transcription.transcript, resource, options);

        return {
            extractedDocumentContent: transcription.transcript,
            transcript: transcription.transcript,
            transcriptionModel: transcription.transcriptionModel,
            sourceMediaType: "video",
            sourceMetadata: {
                extractionMethod: "ffmpeg",
                audioFormat: "mp3",
                audioChannels: 1,
                audioSampleRate: 16000,
                chunkCount: audioChunks.length
            },
            documentExtractionMethod: "ffmpeg+groq-whisper",
            generationModel: process.env.GROQ_TEXT_MODEL || GROQ_TEXT_MODEL,
            ...generatedContent
        };
    } finally {
        await fsp.rm(temporaryDirectory, { recursive: true, force: true });
    }
};

const isPdfResource = (resource) => {
    try {
        const url = new URL(resource.fileUrl);
        return (url.protocol === "http:" || url.protocol === "https:")
            && url.pathname.toLowerCase().endsWith(".pdf");
    } catch (error) {
        return false;
    }
};

const shortenSourceText = (text, maxCharacters) => {
    const normalizedText = (text || "").replace(/\s+/g, " ").trim();
    if (normalizedText.length <= maxCharacters) {
        return normalizedText;
    }

    return `${normalizedText.slice(0, maxCharacters)}\n[Source text shortened for AI processing]`;
};

const getExpeditionSource = async (expedition, resources) => {
    const sourceSections = [
        `Expedition name: ${expedition.name || "Unavailable"}`,
        `Year: ${expedition.year || "Unavailable"}`,
        `Date: ${expedition.date || "Unavailable"}`,
        `Location: ${expedition.location || "Unavailable"}`,
        `Region: ${expedition.region || "Unavailable"}`,
        `Expedition description: ${expedition.description || "Unavailable"}`
    ];

    for (const { resource, aiContent } of resources) {
        let extractedText = aiContent
            && aiContent.sourceFileUrl === resource.fileUrl
            ? (aiContent.transcript || aiContent.extractedDocumentContent)
            : null;

        if (!extractedText && isPdfResource(resource)) {
            extractedText = await extractDocumentContent(resource.fileUrl);
        }

        sourceSections.push([
            `Linked resource title: ${resource.title || "Unavailable"}`,
            `Type: ${resource.type || "Unavailable"}`,
            `Category: ${resource.category || "Unavailable"}`,
            `Description: ${resource.description || "Unavailable"}`,
            `Tags: ${(resource.tags || []).join(", ") || "Unavailable"}`,
            `Extracted PDF text or transcript: ${
                shortenSourceText(extractedText, EXPEDITION_RESOURCE_TEXT_MAX_CHARS)
                || "Unavailable"
            }`,
            "Use the extracted text or transcript as the primary source for this resource. Use metadata only as supporting context."
        ].join("\n"));
    }

    const sourceText = shortenSourceText(
        sourceSections.join("\n\n"),
        EXPEDITION_SOURCE_MAX_CHARS
    );

    return {
        sourceText,
        sourceFingerprint: crypto
            .createHash("sha256")
            .update(sourceText)
            .digest("hex"),
        sourceResourceIds: resources.map(({ resource }) => resource._id),
        sourceResourceCount: resources.length
    };
};

const generateExpeditionContent = async (
    expedition,
    resources,
    options = {},
    source = null
) => {
    const expeditionSource = source || await getExpeditionSource(expedition, resources);
    const generatedContent = await generateContent(
        expeditionSource.sourceText,
        {
            title: expedition.name,
            description: expedition.description,
            type: "expedition",
            category: expedition.region || expedition.location || "expedition"
        },
        options
    );

    return {
        ...generatedContent,
        sourceFingerprint: expeditionSource.sourceFingerprint,
        sourceResourceIds: expeditionSource.sourceResourceIds,
        sourceResourceCount: expeditionSource.sourceResourceCount,
        generationModel: process.env.GROQ_TEXT_MODEL || GROQ_TEXT_MODEL
    };
};

module.exports = {
    generateDocumentContent,
    generateVideoContent,
    generateExpeditionContent,
    getExpeditionSource
};
