import math
import re
from typing import List, Dict, Any, Optional, Tuple
from app.ai.schemas import CitationReference

class ReferenceDocument:
    def __init__(
        self,
        reference_id: str,
        title: str,
        domain: str,
        content: str,
        key_facts: List[str],
        source_document: str,
        url: Optional[str] = None
    ):
        self.reference_id = reference_id
        self.title = title
        self.domain = domain
        self.content = content
        self.key_facts = key_facts
        self.source_document = source_document
        self.url = url
        self.tokens = self._tokenize(content)

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        return [w for w in cleaned.split() if len(w) > 2]

class ApprovedReferenceStore:
    """
    Approved Reference Corpus and Grounded Retriever.
    Contains verified academic materials and technical specifications.
    Guarantees that references returned in AI reports are strictly from this approved index.
    """

    def __init__(self):
        self._corpus: Dict[str, ReferenceDocument] = {}
        self._seed_default_references()

    def add_reference(self, ref: ReferenceDocument):
        self._corpus[ref.reference_id] = ref

    def _seed_default_references(self):
        # 1. Python Architecture & Execution
        self.add_reference(
            ReferenceDocument(
                reference_id="ref-jain-py-001",
                title="Python Official Execution Model & Runtime Architecture",
                domain="Programming",
                content=(
                    "Python is an interpreted, high-level language that first compiles source code (.py) "
                    "into an intermediate bytecode format (.pyc) before executing it on the Python Virtual Machine (CPython). "
                    "Python is NOT a purely compiled language like C/C++, nor is it purely interpreted line-by-line without compilation. "
                    "Dynamic typing and automatic memory management via reference counting and garbage collection are core features."
                ),
                key_facts=[
                    "Python compiles source to bytecode before VM execution",
                    "Python is not purely compiled like C",
                    "CPython uses a Virtual Machine"
                ],
                source_document="Jain FET CSE Curriculum: Programming Paradigms v2.1"
            )
        )

        # 2. Linux Operating System & Permissions
        self.add_reference(
            ReferenceDocument(
                reference_id="ref-jain-linux-002",
                title="UNIX & Linux Operating System File Permissions Standard",
                domain="Systems & OS",
                content=(
                    "In Linux file permissions, chmod modifies read (r=4), write (w=2), and execute (x=1) permissions "
                    "for user, group, and others. The command 'chmod +x script.sh' marks a file as executable without deleting "
                    "or renaming it. The command 'ls' lists directory contents, 'cd' changes directory, and 'rm' removes files."
                ),
                key_facts=[
                    "chmod +x adds execution rights",
                    "read=4, write=2, execute=1",
                    "ls lists directory contents"
                ],
                source_document="FET Operating Systems Lab Manual — Module 2"
            )
        )

        # 3. Data Structures & Algorithms (Time Complexity)
        self.add_reference(
            ReferenceDocument(
                reference_id="ref-jain-dsa-003",
                title="Algorithms & Complexity Analysis Standards",
                domain="Algorithms",
                content=(
                    "Binary search requires a sorted array and operates in O(log n) time complexity. "
                    "Hash table lookup operates in average case O(1) time complexity, with worst-case O(n) under collisions. "
                    "Merge sort provides guaranteed O(n log n) sorting performance and is a stable sort."
                ),
                key_facts=[
                    "Binary search requires sorted array and has O(log n) complexity",
                    "Hash tables have average O(1) lookup",
                    "Merge sort is O(n log n)"
                ],
                source_document="Jain FET Data Structures & Algorithms Core Textbook"
            )
        )

        # 4. Networking & Protocols
        self.add_reference(
            ReferenceDocument(
                reference_id="ref-jain-net-004",
                title="Computer Networks: Transport Layer Protocols",
                domain="Networking",
                content=(
                    "TCP (Transmission Control Protocol) is a connection-oriented, reliable protocol providing "
                    "flow control, congestion control, and ordered packet delivery via a 3-way handshake. "
                    "UDP (User Datagram Protocol) is connectionless, unreliable, and low-latency, suitable for video streaming."
                ),
                key_facts=[
                    "TCP is connection-oriented and reliable",
                    "UDP is connectionless and does not guarantee delivery",
                    "TCP uses 3-way handshake"
                ],
                source_document="Jain FET Computer Networks Reference Specification"
            )
        )

        # 5. Database Management (ACID Properties)
        self.add_reference(
            ReferenceDocument(
                reference_id="ref-jain-db-005",
                title="Database Systems: Transaction Processing & ACID",
                domain="Databases",
                content=(
                    "Relational database transactions adhere to ACID properties: Atomicity (all or nothing), "
                    "Consistency (valid state transitions), Isolation (independent transactions), and Durability (persisted commits). "
                    "SQL transactions rely on write-ahead logging (WAL) for crash recovery."
                ),
                key_facts=[
                    "ACID stands for Atomicity, Consistency, Isolation, Durability",
                    "Atomicity guarantees all-or-nothing execution"
                ],
                source_document="Jain FET Database Management Systems Syllabus"
            )
        )

    def retrieve(self, query: str, top_k: int = 2) -> List[Tuple[CitationReference, float]]:
        """
        Retrieves top relevant reference citations for a given query text using BM25-like scoring.
        Returns a list of (CitationReference, relevance_score).
        """
        query_tokens = ReferenceDocument._tokenize(query)
        if not query_tokens:
            return []

        scored_docs: List[Tuple[ReferenceDocument, float, str]] = []

        for ref_id, doc in self._corpus.items():
            doc_token_set = set(doc.tokens)
            matches = [t for t in query_tokens if t in doc_token_set]
            if not matches:
                continue

            # Compute term overlap score
            overlap_score = len(matches) / (math.sqrt(len(query_tokens)) * math.sqrt(len(doc.tokens)) + 1e-5)

            # Boost if key facts match
            for fact in doc.key_facts:
                fact_tokens = ReferenceDocument._tokenize(fact)
                fact_matches = [t for t in query_tokens if t in set(fact_tokens)]
                if len(fact_matches) >= 2:
                    overlap_score += 0.35

            # Find best matching snippet
            sentences = [s.strip() for s in doc.content.split(". ") if s.strip()]
            best_snippet = doc.content[:200]
            best_snippet_score = -1.0
            for s in sentences:
                s_tokens = set(ReferenceDocument._tokenize(s))
                s_overlap = len([t for t in query_tokens if t in s_tokens])
                if s_overlap > best_snippet_score:
                    best_snippet_score = s_overlap
                    best_snippet = s + "."

            scored_docs.append((doc, overlap_score, best_snippet))

        scored_docs.sort(key=lambda x: x[1], reverse=True)

        results: List[Tuple[CitationReference, float]] = []
        for doc, score, snippet in scored_docs[:top_k]:
            citation = CitationReference(
                reference_id=doc.reference_id,
                title=doc.title,
                snippet=snippet,
                source_document=doc.source_document,
                url=doc.url
            )
            results.append((citation, score))

        return results

# Singleton instance
default_reference_store = ApprovedReferenceStore()
