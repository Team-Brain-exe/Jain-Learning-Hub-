# Demo Test Assets Bundle

This directory provides standardized, non-sensitive sample inputs and known expectations for faculty review demos and automated pipeline tests.

---

## Catalog of Demo Assets

| File Name | Format | Included Academic Content | Purpose in Demo / Evaluation |
|---|---|---|---|
| `demo_python_lecture.pdf` | PDF | • CPython bytecode execution model<br>• Relational database ACID properties | Tests multi-page extraction (`Page 1`, `Page 2`) and clean fact verification (`NO_ISSUE_DETECTED`). |
| `demo_algorithm_slides.pptx` | PPTX | • Slide 1: Course title<br>• Slide 2: Binary search $O(\log n)$ requirement on sorted arrays<br>• Speaker notes: Sorting prerequisite | Tests presentation slide extraction, speaker notes capture, and clean reference grounding. |
| `demo_operating_systems.docx` | DOCX | • Section: Operating Systems (Linux chmod permissions)<br>• Section: Networking Protocols (TCP vs UDP) | Tests document section grouping and table parsing. |
| `demo_lecture.mp4` | Video Container | • Sidecar transcript: `demo_lecture.transcript.txt`<br>• Subtitles: `demo_lecture.vtt` | Contains **2 deliberate issues**: <br>1. At `02:40`: *"Python is a compiled-only programming language"* (`POTENTIAL_ERROR`).<br>2. At `04:15`: *"binary search lookup is O(1) in all scenarios"* (`CONTRADICTION` with Slide 2). |
| `demo_architecture_diagram.png` | PNG | 400x200 diagram image with technical border and title text. | Tests visual diagram inspection and separation of observed structure from interpretation. |

---

## How to Regenerate Demo Assets
If assets need to be updated or recreated:
```bash
backend/venv/bin/python backend/demo_assets/generate_demo_assets.py
```
