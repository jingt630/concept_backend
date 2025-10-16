---
timestamp: 'Thu Oct 16 2025 18:25:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_182541.1a264cf2.md]]'
content_id: 6526a54564a836bb9623678d5f135d5095f9f51624c5e3de30fe4c6c685c2602
---

# Concept: `OutputRender`

**Concept** `OutputRender`

**Purpose** To generate media files with translated content overlaid.

**Principle** Given an imagePath and information about where to place translated text, the system generates output versions.

**State**

A set of `OutputVersion` objects. An `OutputVersion` is defined as:

```
OutputVersion {
  imagePath: String
  renderedData: RenderedContent
}
```

Where `RenderedContent` is a structured representation of the translated text and its placement information, *independent* of the `Translation` or `ExtractionResult` concepts themselves. `RenderedContent` could look like this:

```
RenderedContent {
  // A list of text elements to render
  textElements: [
    {
      text: String,          // The translated text
      position: { x: Integer, y: Integer, x2: Integer, y2: Integer }, // Bounding box for placement
      font-size: String,          // Optional: Font details
      color: String,         // Optional: Text color
      // ... other rendering properties
    }
  ]
}
```

**Actions**

`render(imagePath:String, contentToRender: RenderedContent): (output: OutputVersion)`
**require:** `imagePath` exists, `contentToRender` contains valid rendering instructions, such as valid color, positive font size, non-negative positions
**effect:** Creates a new `OutputVersion` by overlaying the `contentToRender` onto the file at `imagePath`. The `contentToRender` provides all necessary information for positioning and styling.

`export(output: OutputVersion, destination: String, type: String): (file: File)`
**require:** `output` exists, `destination` is a valid path on the user's device, `type` is a supported export format.
**effect:** Saves or downloads the `output` media file to the specified `destination` in the chosen `type`.

format the translation concept into the same format as the likertsurvey format
