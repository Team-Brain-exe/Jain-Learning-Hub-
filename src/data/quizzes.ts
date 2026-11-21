import type { Quiz } from "@/data/platform";

/** Sample assessments for two of the demo courses. Replace with faculty-authored banks. */
export const sampleQuizzes: Record<string, Quiz> = {
  "python-programming-fundamentals": {
    passMark: 70, maxAttempts: 3,
    questions: [
      { id: "py1", prompt: "Which of these is a mutable data type in Python?", options: ["tuple", "list", "str", "int"], correct: 1, explanation: "Lists can be changed in place; tuples, strings and ints cannot." },
      { id: "py2", prompt: "What does `len([1, 2, 3])` return?", options: ["2", "3", "4", "An error"], correct: 1, explanation: "The list has three elements." },
      { id: "py3", prompt: "Which keyword defines a function?", options: ["func", "function", "def", "lambda only"], correct: 2, explanation: "Functions are defined with `def`." },
      { id: "py4", prompt: "What is the output of `print(10 // 3)`?", options: ["3.33", "3", "4", "1"], correct: 1, explanation: "`//` is floor division." },
      { id: "py5", prompt: "Which structure stores key–value pairs?", options: ["set", "tuple", "dictionary", "list"], correct: 2, explanation: "Dictionaries map keys to values." },
    ],
  },
  "data-structures-and-algorithms": {
    passMark: 70,
    maxAttempts: 3,
    proctor: {
      durationMinutes: 2,
      maxViolations: 3,
      requireFullscreen: true,
      shuffleQuestions: true,
      shuffleOptions: true,
    },
    questions: [
      {
        id: "ds1",
        section: "A · Basics",
        prompt: "Time complexity of binary search on a sorted array?",
        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        correct: 1,
        explanation: "Each step halves the search space.",
      },
      {
        id: "ds2",
        section: "A · Basics",
        prompt: "Which structure is LIFO?",
        options: ["Queue", "Stack", "Heap", "Graph"],
        correct: 1,
        explanation: "A stack removes the most recently added item first.",
      },
      {
        id: "ds3",
        section: "A · Basics",
        prompt: "Which traversal uses a queue?",
        options: ["Depth-first", "Breadth-first", "In-order", "Post-order"],
        correct: 1,
        explanation: "BFS explores level by level using a queue.",
      },
      {
        id: "ds4",
        section: "A · Basics",
        prompt: "Worst-case time of inserting at the head of a singly linked list?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        correct: 0,
        explanation: "Only pointer updates are needed.",
      },
      {
        id: "ds5",
        section: "B · Applied",
        type: "multi",
        prompt: "Which of these sorting algorithms have O(n log n) average-case time?",
        options: ["Merge sort", "Bubble sort", "Quick sort", "Insertion sort"],
        correct: 0,
        correctAll: [0, 2],
        explanation:
          "Merge sort and quick sort average O(n log n); bubble and insertion sort are O(n²).",
      },
      {
        id: "ds6",
        section: "B · Applied",
        type: "truefalse",
        prompt: "A hash table offers O(1) average-case lookup.",
        options: ["True", "False"],
        correct: 0,
        explanation:
          "With a good hash function and few collisions, lookups take constant time on average.",
      },
      {
        id: "ds7",
        section: "B · Applied",
        type: "truefalse",
        prompt: "A binary search tree always stays balanced after insertions.",
        options: ["True", "False"],
        correct: 1,
        explanation:
          "Without rebalancing (e.g. AVL or red-black trees), a BST can degrade into a list.",
      },
      {
        id: "ds8",
        section: "B · Applied",
        prompt: "Which data structure best suits scheduling the highest-priority task first?",
        options: ["Stack", "Queue", "Priority queue (heap)", "Linked list"],
        correct: 2,
        explanation: "A heap-backed priority queue returns the highest-priority item in O(log n).",
      },
      {
        id: "ds9",
        section: "B · Applied",
        type: "multi",
        prompt:
          "Which algorithms can find shortest paths in a weighted graph with non-negative edges?",
        options: [
          "Dijkstra's algorithm",
          "Depth-first search",
          "Bellman-Ford",
          "Kruskal's algorithm",
        ],
        correct: 0,
        correctAll: [0, 2],
        explanation:
          "Dijkstra and Bellman-Ford both work; DFS ignores weights and Kruskal builds a spanning tree.",
      },
      {
        id: "ds10",
        section: "B · Applied",
        prompt: "What does memoization do to speed up recursion?",
        options: [
          "Sorts the inputs",
          "Caches results of subproblems",
          "Uses more threads",
          "Removes base cases",
        ],
        correct: 1,
        explanation: "Storing subproblem results avoids recomputation.",
      },
    ],
  },
};
