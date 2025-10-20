import { GeminiLLM } from './gemini-llm';
import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size';

// ---------- State Types ----------
export interface Coordinates {
  x: number;
  y: number;
}

export interface ExtractionResult {
  source: string; // filename
  extractedText: string;
  fromCoord: Coordinates;
  toCoord: Coordinates;
}

export class TextExtraction {
  public results: ExtractionResult[] = [];
    /**
   * Extract the declared final "Number of text block" value from the response.
   * Returns the integer N if found, otherwise null.
   */
  extractDeclaredCount(response: string): number | null {
    if (!response || response === 'No text found') return null;
    // Find last explicit "Number of text block(s): N"
    const matches = [...response.matchAll(/Number of text block(?:s)?\s*[:\-]\s*(\d+)/gi)];
    if (matches.length > 0) {
      const last = matches[matches.length - 1];
      const n = parseInt(last[1], 10);
      return Number.isNaN(n) ? null : n;
    }
    // Fallback: last digit character in the trimmed response
    const trimmed = response.trim();
    const lastChar = trimmed.slice(-1);
    if (/\d/.test(lastChar)) return parseInt(lastChar, 10);
    return null;
  }

  /**
   * Parse a numbered-block response into an ordered list of text blocks (ignore coordinates).
   * Example input lines:
   * 1: "Abra" (from: {...}, to: {...})
   * 2: Cookie
   * Number of text blocks: 2
   *
   * Returns ['Abra', 'Cookie']
   */
  parseNumberedTextList(response: string): string[] {
    if (!response || response === 'No text found') return [];

    const items: Array<{ idx: number; text: string }> = [];
    const lines = response.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip the final summary line
      if (/^Number of text block/i.test(line)) continue;

      // Match "1: text", "1. text", "1) text"
      const m = line.match(/^\s*(\d+)\s*[:\.\)]\s*(.*)$/);
      if (!m) continue;

      const idx = parseInt(m[1], 10);
      let text = m[2].trim();

      // Remove trailing coordinate parenthesis if present: "(from: ... to: ...)" or any trailing parenthetical block
      text = text.replace(/\s*\([^)]*(from|to)[^)]*\)\s*$/i, '').trim();
      // If still ends with a parenthetical without coords, remove trailing (...) to be safe
      text = text.replace(/\s*\([^)]*\)\s*$/, '').trim();

      // Strip surrounding quotes and HTML-like tags
      text = text.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').replace(/<\/?[^>]+(>|$)/g, '').trim();

      if (text.length > 0) items.push({ idx, text });
    }

    if (items.length === 0) return [];

    items.sort((a, b) => a.idx - b.idx);
    return items.map((p) => p.text);
  }

  /**
     * Parse all coordinates from the LLM OCR output.
     * Returns a list of objects containing the block index and its coordinates.
     * The order matches the numbered text block order in the output.
     */
    parseCoordinatesList(response: string): { fromCoord: { x: number; y: number }, toCoord: { x: number; y: number } }[] {
    const coordRegex =
        /\(\s*from:\s*\{x:(-?\d+),\s*y:(-?\d+)\},\s*to:\s*\{x:(-?\d+),\s*y:(-?\d+)\}\s*\)/g;

    const matches = [...response.matchAll(coordRegex)];
    const results = matches.map(match => ({
        fromCoord: { x: parseInt(match[1], 10), y: parseInt(match[2], 10) },
        toCoord: { x: parseInt(match[3], 10), y: parseInt(match[4], 10) },
    }));

    return results;
    }

    async extractTextFromMedia(llm: GeminiLLM, imagePath: string): Promise<string> {
        try {
            if (!fs.existsSync(imagePath)) throw new Error("Image file not found");
            console.log(`🧠 Extracting text from: ${imagePath}`);
            const resolvedPath = path.resolve(imagePath);
            const buffer = await fs.promises.readFile(resolvedPath);
            const dimensions = sizeOf(buffer);
            if (!dimensions.width || !dimensions.height) {
                throw new Error("Unable to determine image dimensions");
            }
            console.log(`Image dimensions: ${dimensions.width}x${dimensions.height}`);
            // Compose a single string payload that includes the prompt and the base64 image.
            // Clear markers help the model identify the image data.
            const payload = `You are an OCR assistant. Read all visible text in the given image
            and return only the readable text. Do not describe the image or repeat the base64 data.
            Return plain text only, formatted for readability by numbering each text block u recognize.
            Also keep track of the position of each text block in the image, using coordinates.
            Coordinates are given as (x,y) pairs, where (0,0) is the top-left corner of the image.
            The 'from' coordinate is the top-left corner of the text block, and the 'to' coordinate is
            the bottom-right corner. The coordinates should be integers representing pixel positions in the image
            relative to the image dimensions. If no text can be found, return "No text found". When two or more
            short text segments appear close together (within the same logical phrase or line group), merge them
            into a single text block rather than splitting them. Treat small vertical spacing as part of the same
            block if the text forms a continuous sentence or title.
            Do not add, infer, or search for any information that is not explicitly readable.
            Do not use external knowledge or guess missing words based on what the image might represent.
            Apply the same grouping logic for all languages — English, Chinese, or others — merging vertically or
            horizontally aligned characters that form a single title or phrase.
            When estimating coordinates, ensure that (from) and (to) precisely cover only the visible text area.
            Avoid random or uniform coordinates that do not match the actual layout.
            Keep numeric elements together with their associated words (e.g., “2025” and “Festival”)
            in a single text block whenever they belong to the same phrase or visual line.
            The incoming image's dimensions is ${dimensions.width}x${dimensions.height}. Label textblocks with accurate coordinates
            that is relevant to the image's dimensions.
            Strictly follow this format, with no extra commentary:
            An example response format:
            1: <text> (from: {x:12, y:34}, to: {x:56, y:78})
            2: <text> (from: {x:90, y:12}, to: {x:34, y:56})
            ...
            N: <text> (from: {x:A, y:B}, to: {x:C, y:D})
            Number of text blocks: N`;

            // Pass prompt + image to Gemini
                const text = await llm.executeLLM(payload, imagePath);
                const resultList = this.parseNumberedTextList(text);
                const coords = this.parseCoordinatesList(text);
                for (let i=0; i<resultList.length; i++) {
                    this.results.push({
                        source: path.basename(imagePath),
                        extractedText: resultList[i],
                        fromCoord: coords[i]?.fromCoord || { x: 0, y: 0 },
                        toCoord: coords[i]?.toCoord || { x: 0, y: 0 },
                    });
                }
                return text;

            } catch (error) {
                console.error('❌ Error extracting text:', (error as Error).message);
                throw error;
            }
    }
  // ---------- ACTION 2: editExtractText ----------
  editExtractText(index: number, newText: string) {
    if (!this.results[index]) throw new Error("Extraction not found");
    this.results[index].extractedText = newText;
  }

  // ---------- ACTION 3: editLocation ----------
  editLocation(index: number, fromCoord: Coordinates, toCoord: Coordinates) {
    if (!this.results[index]) throw new Error("Extraction not found");
    if (fromCoord.x < 0 || fromCoord.y < 0 || toCoord.x < 0 || toCoord.y < 0)
      throw new Error("Coordinates must be non-negative");
    this.results[index].fromCoord = fromCoord;
    this.results[index].toCoord = toCoord;
  }

  // ---------- ACTION 4: addExtractionTxt ----------
  addExtractionTxt(media: string, fromCoord: Coordinates,toCoord: Coordinates): ExtractionResult {
    if (fromCoord.x < 0 || fromCoord.y < 0 || toCoord.x < 0 || toCoord.y < 0)
      throw new Error("Invalid coordinates");
    const overlap = this.results.some((r) =>
      this.overlaps(r.fromCoord, r.toCoord, fromCoord, toCoord)
    );
    if (overlap) throw new Error("Overlapping extraction area");
    const newItem: ExtractionResult = {
      source: media,
      extractedText: "",
      fromCoord,
      toCoord,
    };
    this.results.push(newItem);
    return newItem;
  }

  deleteExtraction(index: number) {
    if (!this.results[index]) throw new Error("Extraction not found");
    this.results.splice(index, 1);
  }

  // ---------- UTIL: overlaps ----------
  // Check if two rectangles overlap
  private overlaps(
    a1: Coordinates,
    a2: Coordinates,
    b1: Coordinates,
    b2: Coordinates
  ) {
    return !(
      a2.x < b1.x ||
      a1.x > b2.x ||
      a2.y < b1.y ||
      a1.y > b2.y
    );
  }

  getAll(): ExtractionResult[] {
    return this.results;
  }

  toString(): string {
    return JSON.stringify(this.results, null, 2);
  }
}
