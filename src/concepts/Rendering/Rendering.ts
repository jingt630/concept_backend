import { Collection, Db, InsertOneResult } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { createCanvas, loadImage } from "npm:canvas";

// Declare collection prefix, use concept name
const PREFIX = "OutputRender" + ".";

// Generic types of this concept
type OutputVersionID = ID;
type RenderedContentID = ID; // Assuming RenderedContent can also have an ID if it's stored separately
type TextElementID = ID; // Assuming TextElement can also have an ID if it's stored separately
type PositionID = ID; // Assuming Position can also have an ID if it's stored separately

/**
 * A Position object with x, y, x2, y2 coordinates.
 */
interface Position {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

/**
 * A TextElement object with text, position, and optional rendering properties.
 */
interface TextElement {
  _id: TextElementID; // Use _id for TextElement if it needs to be individually managed/referenced
  text: string;
  position: Position;
  fontSize?: string;
  color?: string;
  // (other rendering properties)
}

/**
 * RenderedContent object containing a list of text elements.
 */
interface RenderedContent {
  textElements: TextElement[];
}

/**
 * An OutputVersion object representing a generated media file.
 */
interface OutputVersion {
  _id: OutputVersionID;
  imagePath: string;
  renderedData: RenderedContent; // We embed RenderedContent directly for simplicity, but it could be a reference to another collection.
  renderedImageData?: string; // Base64 encoded rendered image
  createdDate: Date;
  owner: ID; // User who created this render
}

/**
 * ExportedFile object to represent local filepath
 */
interface ExportedFile {
  name: string;
  content: string;
  destination: string;
}

export default class OutputRenderConcept {
  outputVersions: Collection<OutputVersion>;
  mediaStorage: Collection<any>; // For accessing stored images
  // We are embedding RenderedContent and TextElement within OutputVersion for simplicity
  // If RenderedContent or TextElement were to be managed independently, they would have their own collections.

  constructor(private readonly db: Db) {
    this.outputVersions = this.db.collection(PREFIX + "outputVersions");
    this.mediaStorage = this.db.collection("MediaStorage.images"); // Access MediaStorage
  }

  /**
   * render (userId: ID, imagePath: String, contentToRender: RenderedContent): (output: OutputVersion)
   *
   * **requires**: `imagePath` exists. `contentToRender` contains valid rendering instructions, such as valid color, positive font size, non-negative positions.
   *
   * **effects**: Creates a new `OutputVersion` by overlaying the `contentToRender` onto the file at `imagePath`. The `contentToRender` provides all necessary information for positioning and styling. Returns the created `OutputVersion` as `output`.
   */
  async render({
    userId,
    imagePath,
    contentToRender,
  }: {
    userId: ID;
    imagePath: string;
    contentToRender: RenderedContent;
  }): Promise<{ output: OutputVersion } | { error: string }> {
    try {
      console.log("🎨 ========== RENDERING IMAGE ==========");
      console.log("   - User ID:", userId);
      console.log("   - Media ID (imagePath):", imagePath);
      console.log(
        "   - Text elements to render:",
        contentToRender.textElements.length,
      );

      // 1. Fetch image from MediaStorage
      const imageDoc = await this.mediaStorage.findOne({
        mediaId: imagePath,
        owner: userId,
      });

      if (!imageDoc || !imageDoc.imageData) {
        console.error("❌ Image not found in storage");
        return { error: "Image not found in storage" };
      }

      console.log("✅ Image found in storage");

      // 2. Decode base64 image data
      let base64Data = imageDoc.imageData;

      // Strip data URI prefix if present
      if (base64Data.startsWith("data:")) {
        base64Data = base64Data.split(",")[1];
      }

      // Decode base64 to buffer
      const imageBuffer = Uint8Array.from(
        atob(base64Data),
        (c) => c.charCodeAt(0),
      );
      console.log("✅ Image decoded, size:", imageBuffer.length, "bytes");

      // 3. Create a temporary file for the image (canvas requires a file path)
      const tempImagePath = `./temp_image_${crypto.randomUUID()}.jpg`;
      await Deno.writeFile(tempImagePath, imageBuffer);
      console.log("✅ Temporary image file created:", tempImagePath);

      // 4. Load image and create canvas
      const image = await loadImage(tempImagePath);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");

      console.log("✅ Canvas created:", image.width, "x", image.height);

      // 5. Draw the original image
      ctx.drawImage(image, 0, 0);
      console.log("✅ Original image drawn");

      // 6. Draw text elements
      for (let i = 0; i < contentToRender.textElements.length; i++) {
        const element = contentToRender.textElements[i];
        const pos = element.position;

        // Calculate text box dimensions
        const boxWidth = pos.x2 - pos.x;
        const boxHeight = pos.y2 - pos.y;

        // Parse font size or use default
        const fontSize = parseInt(element.fontSize || "16");

        // Set text properties
        ctx.fillStyle = element.color || "#FFFFFF";
        ctx.font = `${fontSize}px Arial`;
        ctx.textBaseline = "top";

        // Draw semi-transparent background for better readability
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(pos.x, pos.y, boxWidth, boxHeight);

        // Draw text
        ctx.fillStyle = element.color || "#FFFFFF";

        // Word wrap text to fit in box
        const words = element.text.split(" ");
        let line = "";
        let y = pos.y + 5; // Small padding
        const lineHeight = fontSize * 1.2;

        for (const word of words) {
          const testLine = line + word + " ";
          const metrics = ctx.measureText(testLine);

          if (metrics.width > boxWidth - 10 && line !== "") {
            ctx.fillText(line, pos.x + 5, y);
            line = word + " ";
            y += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, pos.x + 5, y);

        console.log(
          `✅ Text element ${i + 1} rendered: "${
            element.text.substring(0, 30)
          }..."`,
        );
      }

      console.log("✅ All text elements rendered");

      // 7. Convert canvas to base64
      const renderedBuffer = canvas.toBuffer("image/png");
      const renderedBase64 = "data:image/png;base64," +
        btoa(String.fromCharCode(...renderedBuffer));

      console.log(
        "✅ Rendered image encoded, size:",
        renderedBuffer.length,
        "bytes",
      );

      // 8. Clean up temporary file
      try {
        await Deno.remove(tempImagePath);
        console.log("✅ Temporary file cleaned up");
      } catch (cleanupError) {
        console.warn("⚠️ Failed to clean up temp file:", cleanupError);
      }

      // 9. Create OutputVersion document with generated IDs
      const newRenderedContent: RenderedContent = {
        textElements: contentToRender.textElements.map((te) => ({
          ...te,
          _id: crypto.randomUUID() as TextElementID,
        })),
      };

      const newOutputVersion: OutputVersion = {
        _id: crypto.randomUUID() as OutputVersionID,
        imagePath,
        renderedData: newRenderedContent,
        renderedImageData: renderedBase64,
        createdDate: new Date(),
        owner: userId,
      };

      // 10. Save to database
      await this.outputVersions.insertOne(newOutputVersion);
      console.log(
        "✅ Output version saved to database, ID:",
        newOutputVersion._id,
      );
      console.log("========================================");

      return { output: newOutputVersion };
    } catch (error) {
      console.error("❌ Error rendering image:", error);
      return { error: (error as Error).message };
    }
  }

  /**
   * export (output: OutputVersion, destination: String, type: String): (file: File)
   *
   * **requires**: `output` exists. `destination` is a valid path on the user's device. `type` is a supported export format.
   *
   * **effects**: Saves or downloads the `output` media file to the specified `destination` in the chosen `type`. Returns the exported file.
   */
  async export({
    output,
    destination,
    type,
  }: {
    output: OutputVersion;
    destination: string;
    type: string;
  }): Promise<
    {
      file:
        ExportedFile; /* In a real scenario, this would be a File-like object or path */
    }
  > {
    // This is a placeholder for actual file export logic.
    // In a real application, this would involve interacting with file system APIs or cloud storage.

    console.log(
      `Exporting output version ${output._id} to ${destination} as ${type}`,
    );

    // Simulate the creation of a file object.
    // In a real scenario, this would be actual file data.
    const exportedFile = {
      name: `${output._id}.${type}`,
      content: `Simulated content for ${output.imagePath} with rendered data.`,
      destination: `${destination}/${output._id}.${type}`,
    };

    // In a real implementation, you would write 'exportedFile.content' to 'exportedFile.destination'.
    // For demonstration purposes, we just return the simulated file object.

    return { file: exportedFile };
  }

  // --- Queries (example, to support the principle/testing) ---

  /**
   * _getOutputVersionById (userId: ID, outputId: OutputVersionID): (output: OutputVersion)
   *
   * **requires**: `outputId` refers to an existing OutputVersion.
   *
   * **effects**: Returns the OutputVersion with the given ID if owned by user.
   */
  async _getOutputVersionById({
    userId,
    outputId,
  }: {
    userId: ID;
    outputId: OutputVersionID;
  }): Promise<OutputVersion[]> {
    const output = await this.outputVersions.findOne({
      _id: outputId,
      owner: userId,
    });
    return output ? [output] : [];
  }

  /**
   * _getAllOutputVersions (userId: ID): (output: OutputVersion)
   *
   * **requires**: None.
   *
   * **effects**: Returns all OutputVersions for a specific user.
   */
  async _getAllOutputVersions({
    userId,
  }: {
    userId: ID;
  }): Promise<OutputVersion[]> {
    return await this.outputVersions.find({ owner: userId }).toArray();
  }

  /**
   * _getOutputsByMediaId (userId: ID, mediaId: ID): (outputs: OutputVersion[])
   *
   * **requires**: None.
   *
   * **effects**: Returns all OutputVersions for a specific media file.
   */
  async _getOutputsByMediaId({
    userId,
    mediaId,
  }: {
    userId: ID;
    mediaId: ID;
  }): Promise<OutputVersion[]> {
    return await this.outputVersions.find({
      imagePath: mediaId,
      owner: userId,
    }).toArray();
  }

  /**
   * _serveRenderedImage (userId: ID, outputId: OutputVersionID): Binary image data
   *
   * **requires**: `outputId` exists and belongs to user.
   *
   * **effects**: Returns the rendered image as binary data.
   */
  async _serveRenderedImage({
    userId,
    outputId,
  }: {
    userId: ID;
    outputId: OutputVersionID;
  }): Promise<{ data: Uint8Array; contentType: string } | { error: string }> {
    try {
      const output = await this.outputVersions.findOne({
        _id: outputId,
        owner: userId,
      });

      if (!output || !output.renderedImageData) {
        return { error: "Rendered image not found" };
      }

      // Decode base64 to binary
      let base64Data = output.renderedImageData;
      if (base64Data.startsWith("data:")) {
        base64Data = base64Data.split(",")[1];
      }

      const imageBuffer = Uint8Array.from(
        atob(base64Data),
        (c) => c.charCodeAt(0),
      );

      return {
        data: imageBuffer,
        contentType: "image/png",
      };
    } catch (error) {
      console.error("Error serving rendered image:", error);
      return { error: (error as Error).message };
    }
  }
}
