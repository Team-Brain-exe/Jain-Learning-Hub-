import os
import pymupdf
from pptx import Presentation
import docx
from PIL import Image, ImageDraw

def generate_assets(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

    # 1. PDF Asset
    pdf_path = os.path.join(output_dir, "demo_python_lecture.pdf")
    doc = pymupdf.open()
    page1 = doc.new_page()
    page1.insert_text((50, 60), "JAIN (Deemed-to-be University) - Faculty of Engineering & Technology", fontsize=12)
    page1.insert_text((50, 90), "Course: Advanced Software Systems (CSE 401)", fontsize=14)
    page1.insert_text((50, 130), "Python Execution Architecture Overview:", fontsize=12)
    page1.insert_text((50, 160), "CPython compiles source code into bytecode (.pyc) before execution on the VM.", fontsize=11)
    page1.insert_text((50, 190), "Dynamic typing and automatic memory management via garbage collection are standard.", fontsize=11)

    page2 = doc.new_page()
    page2.insert_text((50, 60), "Database Transactions & ACID Properties", fontsize=14)
    page2.insert_text((50, 100), "Relational database transactions adhere to ACID properties:", fontsize=11)
    page2.insert_text((70, 130), "- Atomicity: all or nothing execution", fontsize=11)
    page2.insert_text((70, 155), "- Consistency: valid state transitions", fontsize=11)
    page2.insert_text((70, 180), "- Isolation: independent concurrent transactions", fontsize=11)
    page2.insert_text((70, 205), "- Durability: committed changes persist across crashes", fontsize=11)
    doc.save(pdf_path)
    doc.close()
    print(f"Generated {pdf_path}")

    # 2. PPTX Asset
    pptx_path = os.path.join(output_dir, "demo_algorithm_slides.pptx")
    prs = Presentation()
    slide1 = prs.slides.add_slide(prs.slide_layouts[0])
    slide1.shapes.title.text = "Data Structures & Complexity"
    slide1.placeholders[1].text = "Jain FET Department of Computer Science"

    slide2 = prs.slides.add_slide(prs.slide_layouts[1])
    slide2.shapes.title.text = "Search Algorithms"
    slide2.shapes.placeholders[1].text = (
        "Binary search divide-and-conquer principles:\n"
        "1. Operates on sorted arrays.\n"
        "2. Binary search runs in O(log n) time.\n"
        "3. Guaranteed optimal comparison tree depth."
    )
    if slide2.has_notes_slide:
        slide2.notes_slide.notes_text_frame.text = "Emphasize that binary search strictly requires sorted input."
    prs.save(pptx_path)
    print(f"Generated {pptx_path}")

    # 3. DOCX Asset
    docx_path = os.path.join(output_dir, "demo_operating_systems.docx")
    d = docx.Document()
    d.add_heading("Operating Systems & Networks Syllabus", level=1)
    d.add_paragraph("In Linux, file permissions are managed with chmod for read, write, and execute bits.")
    d.add_heading("Transport Layer Protocols", level=2)
    d.add_paragraph("TCP provides reliable connection-oriented transport, whereas UDP provides low-latency transmission.")
    d.save(docx_path)
    print(f"Generated {docx_path}")

    # 4. Transcript & VTT Asset (Simulating Lecture Video)
    video_dummy = os.path.join(output_dir, "demo_lecture.mp4")
    with open(video_dummy, "wb") as f:
        f.write(b"dummy mp4 container header")

    transcript_txt = os.path.join(output_dir, "demo_lecture.transcript.txt")
    with open(transcript_txt, "w", encoding="utf-8") as f:
        f.write(
            "00:05 Welcome everyone to today's engineering seminar.\n"
            "01:20 In this segment, we discuss runtime execution differences.\n"
            "02:40 Python is a compiled-only programming language.\n"
            "04:15 Also notice that binary search lookup is O(1) in all scenarios.\n"
            "06:00 That concludes our review of foundational principles.\n"
        )
    print(f"Generated {transcript_txt}")

    vtt_path = os.path.join(output_dir, "demo_lecture.vtt")
    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write(
            "WEBVTT\n\n"
            "1\n00:00:05.000 --> 00:00:20.000\nWelcome everyone to today's engineering seminar.\n\n"
            "2\n00:01:20.000 --> 00:01:45.000\nIn this segment, we discuss runtime execution differences.\n\n"
            "3\n00:02:40.000 --> 00:03:10.000\nPython is a compiled-only programming language.\n\n"
            "4\n00:04:15.000 --> 00:04:45.000\nAlso notice that binary search lookup is O(1) in all scenarios.\n\n"
            "5\n00:06:00.000 --> 00:06:30.000\nThat concludes our review of foundational principles.\n"
        )
    print(f"Generated {vtt_path}")

    # 5. PNG Graphic Asset
    img_path = os.path.join(output_dir, "demo_architecture_diagram.png")
    img = Image.new("RGB", (400, 200), color=(240, 245, 250))
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 380, 180], outline=(40, 80, 160), width=3)
    draw.text((40, 85), "JAIN FET AI Verification Architecture", fill=(20, 40, 100))
    img.save(img_path)
    print(f"Generated {img_path}")

if __name__ == "__main__":
    generate_assets(os.path.dirname(os.path.abspath(__file__)))
