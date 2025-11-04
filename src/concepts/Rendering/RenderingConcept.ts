import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";

// NO IMAGE PROCESSING - Just store instructions for frontend rendering
// This avoids ALL ImageScript issues!

const PREFIX = "OutputRender" + ".";

type OutputVersionID = ID;
type TextElementID = ID;

interface Position {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

interface TextElement {
  _id?: TextElementID;
  text: string;
  position: Position;
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
}

interface RenderedContent {
  textElements: TextElement[];
}

interface OutputVersion {
  _id: OutputVersionID;
  imagePath: string;
  renderedData: RenderedContent;
  renderedImageData?: string; // Will store the original image
  createdDate: Date;
  owner: ID;
}

interface ExportedFile {
  name: string;
  content: string;
  destination: string;
}

export default class RenderingConcept {
  outputVersions: Collection<OutputVersion>;
  mediaStorage: Collection<any>;
  mediaFiles: Collection<any>;

  constructor(private readonly db: Db) {
    this.outputVersions = this.db.collection(PREFIX + "outputVersions");
    this.mediaStorage = this.db.collection("MediaStorage.storedImages");
    this.mediaFiles = this.db.collection("MediaManagement.mediaFiles");
  }

  /**
   * render: Stores rendering instructions (frontend will do actual rendering)
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
      console.log('🎨 ========== STORING RENDERING INSTRUCTIONS ==========');
      console.log('   - User ID:', userId);
      console.log('   - Media ID:', imagePath);
      console.log('   - Text elements:', contentToRender.textElements.length);

      // 1. Verify media file
      const mediaFile = await this.mediaFiles.findOne({
        _id: imagePath,
        owner: userId
      });

      if (!mediaFile) {
        return { error: 'Media file not found or access denied' };
      }

      console.log('✅ Media file verified');

      // 2. Get original image
      const imageDoc = await this.mediaStorage.findOne({
        mediaId: imagePath
      });

      if (!imageDoc || !imageDoc.imageData) {
        return { error: 'Image not found in storage' };
      }

      console.log('✅ Image found in storage');

      // 3. Validate text elements
      const validElements = contentToRender.textElements.filter(element => {
        const pos = element.position;
        if (!pos || pos.x < 0 || pos.y < 0 || pos.x2 <= pos.x || pos.y2 <= pos.y) {
          console.warn(`⚠️ Skipping invalid element: ${element.text}`);
          return false;
        }
        return true;
      });

      console.log(`✅ Validated ${validElements.length}/${contentToRender.textElements.length} elements`);

      // 4. Delete any existing render output for this image (keep only latest)
      const existingOutputs = await this.outputVersions.find({
        imagePath: imagePath,
        owner: userId
      }).toArray();

      if (existingOutputs.length > 0) {
        console.log(`🗑️ Deleting ${existingOutputs.length} old render output(s)`);
        await this.outputVersions.deleteMany({
          imagePath: imagePath,
          owner: userId
        });
        console.log('✅ Old outputs deleted');
      }

      // 5. Create output version with instructions
      const newRenderedContent: RenderedContent = {
        textElements: validElements.map((te) => ({
          ...te,
          _id: crypto.randomUUID() as TextElementID,
        })),
      };

      const newOutputVersion: OutputVersion = {
        _id: crypto.randomUUID() as OutputVersionID,
        imagePath,
        renderedData: newRenderedContent,
        renderedImageData: imageDoc.imageData, // Original image (frontend will render on it)
        createdDate: new Date(),
        owner: userId,
      };

      // 6. Save to database
      await this.outputVersions.insertOne(newOutputVersion);
      console.log('✅ Output saved (instructions for frontend rendering)');
      console.log(`   Output ID: ${newOutputVersion._id}`);
      console.log('========================================');

      return { output: newOutputVersion };
    } catch (error) {
      console.error('❌ Error:', error);
      return { error: (error as Error).message };
    }
  }

  async export({ outputId, destination, type }: { outputId: OutputVersionID; destination: string; type: string }): Promise<{ file: ExportedFile } | { error: string }> {
    try {
      const output = await this.outputVersions.findOne({ _id: outputId });
      if (!output) return { error: 'Output not found' };

      return {
        file: {
          name: `rendered_${outputId}.${type}`,
          content: output.renderedImageData || '',
          destination: `${destination}/rendered_${outputId}.${type}`,
        }
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async _getOutputVersionById({ userId, outputId }: { userId: ID; outputId: OutputVersionID }): Promise<OutputVersion[]> {
    const output = await this.outputVersions.findOne({ _id: outputId, owner: userId });
    return output ? [output] : [];
  }

  async _getAllOutputVersions({ userId }: { userId: ID }): Promise<OutputVersion[]> {
    return await this.outputVersions.find({ owner: userId }).toArray();
  }

  async _getOutputsByMediaId({ userId, mediaId }: { userId: ID; mediaId: ID }): Promise<OutputVersion[]> {
    return await this.outputVersions.find({ imagePath: mediaId, owner: userId }).toArray();
  }

  async _serveRenderedImage({ userId, outputId }: { userId: ID; outputId: OutputVersionID }): Promise<{ data: Uint8Array; contentType: string } | { error: string }> {
    try {
      const output = await this.outputVersions.findOne({ _id: outputId, owner: userId });

      if (!output || !output.renderedImageData) {
        return { error: 'Rendered image not found' };
      }

      // Return original image + rendering instructions
      // Frontend will handle the actual rendering
      let base64Data = output.renderedImageData;
      if (base64Data.startsWith('data:')) {
        base64Data = base64Data.split(',')[1];
      }

      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      return {
        data: imageBuffer,
        contentType: 'image/png',
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
}
