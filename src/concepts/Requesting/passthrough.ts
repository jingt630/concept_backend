/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // LikertSurvey - Example/Demo concept
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",

  // User - Public actions that don't require authentication
  "/api/User/create": "anyone can register a new account",
  "/api/User/_getUserByEmail": "needed for login/authentication verification",
  "/api/User/_getUserById": "public profile viewing",
  "/api/User/_getUserProfilePic": "public profile picture viewing",
  "/api/User/_getUserUsername": "public username viewing",
  "/api/User/_getUserEmail":
    "query - client responsible for only requesting own email (TODO: add session auth)",
  "/api/User/_getAllUsers": "public user listing",

  // TextExtraction - Utility methods (helper functions with no data access)
  "/api/TextExtraction/getImageDimensions":
    "utility function for calculating image dimensions",
  "/api/TextExtraction/parseNumberedTextList":
    "utility function for parsing text lists",
  "/api/TextExtraction/parseCoordinatesList":
    "utility function for parsing coordinates",
  "/api/TextExtraction/getImageDimensionsFromBase64":
    "utility function for base64 image dimensions",
  "/api/TextExtraction/parsePNGDimensions": "utility function for PNG parsing",
  "/api/TextExtraction/parseJPEGDimensions":
    "utility function for JPEG parsing",
  "/api/TextExtraction/parseWebPDimensions":
    "utility function for WebP parsing",
  "/api/TextExtraction/getImagePath": "utility function for path construction",

  // TextExtraction - Queries (client-side responsibility for now)
  "/api/TextExtraction/_getExtractionResultsForImage":
    "query - client responsible for only requesting own extractions (TODO: add session auth)",
  "/api/TextExtraction/_getLocationForExtraction":
    "query - client responsible for only requesting own locations (TODO: add session auth)",

  // Translation - Queries (client-side responsibility for now)
  "/api/Translation/_getTranslationById":
    "query - client responsible for only requesting own translations (TODO: add session auth)",
  "/api/Translation/_getTranslationsByOriginalTextId":
    "query - client responsible for only requesting own translations (TODO: add session auth)",

  // MediaManagement - Queries (client-side responsibility for now)
  "/api/MediaManagement/_getMediaFile":
    "query - client responsible for only requesting own media (TODO: add session auth)",
  "/api/MediaManagement/_listMediaFiles":
    "query - client responsible for only listing own media (TODO: add session auth)",
  "/api/MediaManagement/_listFolders":
    "query - client responsible for only listing own folders (TODO: add session auth)",
  "/api/MediaManagement/_serveImage":
    "query - serves images with binary response (client responsible for own media, TODO: add session auth)",

  // Rendering - Queries (client-side responsibility for now)
  "/api/Rendering/_getOutputVersionById":
    "query - client responsible for only requesting own outputs (TODO: add session auth)",
  "/api/Rendering/_getAllOutputVersions":
    "query - client responsible for only listing own outputs (TODO: add session auth)",
  "/api/Rendering/_getOutputsByMediaId":
    "query - client responsible for only requesting own media outputs (TODO: add session auth)",
  "/api/Rendering/_serveRenderedImage":
    "query - serves rendered images with binary response (client responsible for own renders, TODO: add session auth)",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // LikertSurvey - Example/Demo concept
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",

  // User - Actions that require authentication (handled via Requesting syncs)
  "/api/User/delete", // User can only delete their own account
  "/api/User/changeProfilePic", // User can only change their own profile picture

  // TextExtraction - Core actions that require authentication (handled via Requesting syncs)
  "/api/TextExtraction/extractTextFromMedia", // Only owner can extract text from their images
  "/api/TextExtraction/editExtractText", // Only owner can edit their extracted text
  "/api/TextExtraction/syncTranslationsForText", // Only owner can sync their translations
  "/api/TextExtraction/editLocation", // Only owner can edit text locations
  "/api/TextExtraction/addExtractionTxt", // Only owner can add extractions to their images
  "/api/TextExtraction/deleteExtraction", // Only owner can delete their extractions

  // Translation - Core actions that require authentication (handled via Requesting syncs)
  "/api/Translation/createTranslation", // Only owner can create translations for their content
  "/api/Translation/editTranslation", // Only owner can edit their translations
  "/api/Translation/deleteTranslation", // Only owner can delete their translations
  "/api/Translation/changeLanguage", // Only owner can change language of their translations

  // MediaManagement - Core actions that require authentication (handled via Requesting syncs)
  "/api/MediaManagement/upload", // Associate uploaded files with authenticated user
  "/api/MediaManagement/delete", // Only owner can delete their files (cascade deletes extractions/translations)
  "/api/MediaManagement/move", // Only owner can move their files
  "/api/MediaManagement/createFolder", // Associate folders with authenticated user
  "/api/MediaManagement/updateContext", // Only owner can update their file context
  "/api/MediaManagement/addTranslatedText", // Only owner can add translations to their files

  // Rendering - Core actions that require authentication (handled via Requesting syncs)
  "/api/Rendering/render", // Only owner can render their content
  "/api/Rendering/export", // Only owner can export their renders
];
