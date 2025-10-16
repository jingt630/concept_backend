---
timestamp: 'Thu Oct 16 2025 18:00:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_180008.c8743455.md]]'
content_id: 936bf45ab9f5a981cb95f6385ea4ff1c33448416f19d567cb2b61adf1a956b40
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
