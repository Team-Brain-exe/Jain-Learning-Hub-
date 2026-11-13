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
    passMark: 70, maxAttempts: 3,
    questions: [
      { id: "ds1", prompt: "Time complexity of binary search on a sorted array?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct: 1, explanation: "Each step halves the search space." },
      { id: "ds2", prompt: "Which structure is LIFO?", options: ["Queue", "Stack", "Heap", "Graph"], correct: 1, explanation: "A stack removes the most recently added item first." },
      { id: "ds3", prompt: "Which traversal uses a queue?", options: ["Depth-first", "Breadth-first", "In-order", "Post-order"], correct: 1, explanation: "BFS explores level by level using a queue." },
      { id: "ds4", prompt: "Worst-case time of inserting at the head of a singly linked list?", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], correct: 0, explanation: "Only pointer updates are needed." },
    ],
  },
};
