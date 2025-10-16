---
timestamp: 'Thu Oct 16 2025 17:41:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_174140.7c8271ae.md]]'
content_id: d3cd10588387e9a7464953cd7cad71532957a493a49e4280ccb48a1ee62d2e15
---

# prompt: now with all the previous concepts and feedback I gave, to resolve the

issues we would need to use generic types like string, number. However, I don't want to keep passing more and more informations as we go down the concept.

Like mediaFile creation only needs some filePath, but then extracted text need
to store texts extracted and positions for each text.

Then for translation, it needs to know positions and the texts, and store the translated text.

Finally for output, it needs to know the position and the translated text to
create a rendered version.

What is another way to solve this in concept design?
