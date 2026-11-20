export type Actor = "Peer (Student)" | "System" | "Faculty" | "AI System";

export interface ConsentStep {
  n: number;
  title: string;
  description: string;
  actor: Actor;
}

export const consentSteps: ConsentStep[] = [
  {
    n: 1,
    title: "Peer Logs In",
    description: "Peer logs into the JAIN FET Learning Hub portal.",
    actor: "Peer (Student)",
  },
  {
    n: 2,
    title: "Fills Consent Form",
    description: "Student completes the required course consent form and proposal details.",
    actor: "Peer (Student)",
  },
  {
    n: 3,
    title: "Submits Request",
    description: "Peer submits the upload permission request for faculty review.",
    actor: "Peer (Student)",
  },
  {
    n: 4,
    title: "Faculty Receives Email",
    description: "System notifies the assigned faculty reviewer via email.",
    actor: "System",
  },
  {
    n: 5,
    title: "Faculty Reviews Request",
    description: "Faculty evaluates proposal objectives, syllabus fit, and feasibility.",
    actor: "Faculty",
  },
  {
    n: 6,
    title: "Status Updates on Website",
    description: "Website updates request status to approved or rejected.",
    actor: "System",
  },
  {
    n: 7,
    title: "Approved Peer Uploads Content",
    description: "Approved student creator gains access to upload course lessons and assets.",
    actor: "Peer (Student)",
  },
  {
    n: 8,
    title: "AI Checks Content",
    description: "AI automated pre-check scans uploaded content for curriculum compliance.",
    actor: "AI System",
  },
  {
    n: 9,
    title: "Final Faculty Review",
    description: "Faculty reviewer performs final verification of lessons and quizzes.",
    actor: "Faculty",
  },
  {
    n: 10,
    title: "Content is Published",
    description: "Approved course is published to the university learning hub catalog.",
    actor: "System",
  },
];
