import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearningWelcome } from "@/components/learning/LearningWelcome";
import { LearningStats } from "@/components/learning/LearningStats";
import { ContinueLearningCard } from "@/components/learning/ContinueLearningCard";
import { LearningActivityPanel } from "@/components/learning/LearningActivityPanel";
import { LearningGoalsPanel } from "@/components/learning/LearningGoalsPanel";
import {
  getStoredLearnerGoal,
  setStoredLearnerGoal,
  formatActivityTime,
  findNextMilestone,
} from "@/data/learning";
import { courses } from "@/data/courses";
import { Route } from "@/routes/my-learning";
import { useLearner } from "@/hooks/use-enrollment";
import { useAuth } from "@/hooks/use-auth";
import { useAllCourses } from "@/data/platform";

// Mock TanStack Router Link to render regular anchors
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      className,
      ...props
    }: {
      to: string;
      params?: Record<string, string>;
      children: React.ReactNode;
      className?: string;
    }) => {
      let href = to;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          href = href.replace(`$${k}`, v);
        });
      }
      return (
        <a href={href} className={className} {...props}>
          {children}
        </a>
      );
    },
  };
});

vi.mock("@/hooks/use-enrollment", () => ({
  useLearner: vi.fn(),
  enroll: vi.fn(),
  setLessonComplete: vi.fn(),
  syncEnrollmentsFromApi: vi.fn(),
  visitLesson: vi.fn(),
  useEnrollments: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/data/platform", () => ({
  useAllCourses: vi.fn(),
}));

const mockPythonCourse = courses[0]!;
const mockDsaCourse = courses[1]!;

describe("Learning Dashboard Redesign Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("M-1: LearningWelcome Component", () => {
    it("greets user with first name when signed in", () => {
      render(
        <LearningWelcome userName="Manthan Sharma" topResumable={null} hasEnrollments={false} />,
      );

      expect(screen.getByText(/Welcome back,/i)).toBeInTheDocument();
      expect(screen.getByText("Manthan")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /explore courses/i })).toHaveAttribute(
        "href",
        "/courses",
      );
    });

    it("falls back to generic Learner greeting when user name is missing", () => {
      render(<LearningWelcome userName={null} topResumable={null} hasEnrollments={false} />);

      expect(screen.getByText("Learner")).toBeInTheDocument();
    });

    it("handles whitespace-only user names gracefully", () => {
      render(<LearningWelcome userName="   " topResumable={null} hasEnrollments={false} />);

      expect(screen.getByText("Learner")).toBeInTheDocument();
    });

    it("displays prominent Continue Learning button when topResumable is provided", () => {
      render(
        <LearningWelcome
          userName="Aarav"
          topResumable={{
            course: mockPythonCourse,
            lessonId: "1-2",
            lessonTitle: "Installing Python",
          }}
          hasEnrollments={true}
          completedCoursesCount={1}
        />,
      );

      const continueBtn = screen.getByRole("link", { name: /continue learning/i });
      expect(continueBtn).toHaveAttribute("href", "/learn/python-programming-fundamentals/1-2");
      expect(screen.getByRole("link", { name: /view 1 earned certificate/i })).toHaveAttribute(
        "href",
        "/certificates",
      );
    });
  });

  describe("M-2: LearningStats Component", () => {
    it("renders accurate counts and labels across all metric cards", () => {
      render(
        <LearningStats
          enrolledCount={3}
          lessonsDoneCount={12}
          completedCount={1}
          inProgressCount={2}
        />,
      );

      expect(screen.getByText("Enrolled Courses")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();

      expect(screen.getByText("Lessons Completed")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();

      expect(screen.getByText("Courses Completed")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();

      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("handles zero stats gracefully for new learners", () => {
      render(
        <LearningStats
          enrolledCount={0}
          lessonsDoneCount={0}
          completedCount={0}
          inProgressCount={0}
        />,
      );

      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBe(4);
    });
  });

  describe("M-3: ContinueLearningCard Component", () => {
    it("renders resume information, thumbnail, next lesson and progress bar", () => {
      render(
        <ContinueLearningCard
          course={mockPythonCourse}
          resumeLessonId="1-3"
          nextLessonTitle="First Python Program"
          progressPercent={45}
          completedLessonsCount={6}
          totalLessonsCount={14}
        />,
      );

      expect(screen.getByText(mockPythonCourse.title)).toBeInTheDocument();
      expect(screen.getByText("First Python Program")).toBeInTheDocument();
      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.getByText("6 of 14 lessons completed")).toBeInTheDocument();

      const resumeLink = screen.getByRole("link", { name: /continue learning/i });
      expect(resumeLink).toHaveAttribute("href", "/learn/python-programming-fundamentals/1-3");
    });

    it("displays completed state when course progress is 100%", () => {
      render(
        <ContinueLearningCard
          course={mockPythonCourse}
          resumeLessonId="1-1"
          nextLessonTitle="What is Python?"
          progressPercent={100}
          completedLessonsCount={14}
          totalLessonsCount={14}
        />,
      );

      expect(screen.getByText("Course Completed")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /review course/i })).toBeInTheDocument();
      expect(screen.getByText("Certificate ready")).toBeInTheDocument();
    });
  });

  describe("M-4: LearningActivityPanel Component", () => {
    it("renders empty state message when there are no recent activity items", () => {
      render(<LearningActivityPanel items={[]} />);

      expect(screen.getByText("No recent activity recorded yet.")).toBeInTheDocument();
    });

    it("lists recently accessed lessons with accurate titles and links", () => {
      const items = [
        {
          course: mockPythonCourse,
          lessonId: "1-2",
          lessonTitle: "Installing Python",
          progressPercent: 25,
          timestamp: Date.now() - 1000 * 60 * 10, // 10 minutes ago
        },
        {
          course: mockDsaCourse,
          lessonId: "2-1",
          lessonTitle: "Arrays and Strings",
          progressPercent: 50,
          timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
        },
      ];

      render(<LearningActivityPanel items={items} />);

      expect(screen.getByText("Installing Python")).toBeInTheDocument();
      expect(screen.getByText("Arrays and Strings")).toBeInTheDocument();
      expect(screen.getByText("10m ago")).toBeInTheDocument();
      expect(screen.getByText("2h ago")).toBeInTheDocument();
      expect(screen.getByText("25% complete")).toBeInTheDocument();
      expect(screen.getByText("50% complete")).toBeInTheDocument();
    });
  });

  describe("M-5: LearningGoalsPanel Component & Helpers", () => {
    it("reads and writes goal in localStorage with helper functions", () => {
      expect(getStoredLearnerGoal()).toBe(5);

      setStoredLearnerGoal(8);
      expect(getStoredLearnerGoal()).toBe(8);

      // Edge case clamping
      setStoredLearnerGoal(999);
      expect(getStoredLearnerGoal()).toBe(50);
    });

    it("allows adjusting personal goal target via preset buttons and persists", () => {
      render(
        <LearningGoalsPanel
          totalLessonsDone={4}
          completedCoursesCount={0}
          nextMilestone={{
            courseTitle: mockPythonCourse.title,
            remainingLessons: 10,
            percent: 30,
          }}
        />,
      );

      expect(screen.getByText("/ 5 lessons target")).toBeInTheDocument();

      const preset8 = screen.getByRole("button", { name: "Set target to 8 lessons" });
      fireEvent.click(preset8);

      expect(screen.getByText("/ 8 lessons target")).toBeInTheDocument();
      expect(getStoredLearnerGoal()).toBe(8);
      expect(screen.getByText("Saved locally")).toBeInTheDocument();
    });

    it("displays next milestone details and certificate shortcut link", () => {
      render(
        <LearningGoalsPanel
          totalLessonsDone={7}
          completedCoursesCount={2}
          nextMilestone={{
            courseTitle: "Python Programming Fundamentals",
            remainingLessons: 7,
            percent: 50,
          }}
        />,
      );

      expect(screen.getByText("7 lessons remaining to complete this course.")).toBeInTheDocument();
      expect(screen.getByText("50% complete")).toBeInTheDocument();

      const certLink = screen.getByRole("link", { name: /view 2 certificates/i });
      expect(certLink).toHaveAttribute("href", "/certificates");
    });

    it("calculates next milestone correctly with findNextMilestone", () => {
      const milestone = findNextMilestone([
        { course: mockPythonCourse, progress: { done: 10, total: 14, percent: 71 } },
        { course: mockDsaCourse, progress: { done: 2, total: 14, percent: 14 } },
      ]);

      expect(milestone).not.toBeNull();
      expect(milestone?.courseTitle).toBe(mockPythonCourse.title);
      expect(milestone?.remainingLessons).toBe(4);
      expect(milestone?.percent).toBe(71);
    });

    it("formats relative activity time properly", () => {
      expect(formatActivityTime(undefined)).toBe("Recently");
      expect(formatActivityTime(Date.now() - 1000 * 20)).toBe("Just now");
      expect(formatActivityTime(Date.now() - 1000 * 60 * 5)).toBe("5m ago");
      expect(formatActivityTime(Date.now() - 1000 * 60 * 60 * 3)).toBe("3h ago");
      expect(formatActivityTime(Date.now() - 1000 * 60 * 60 * 25)).toBe("Yesterday");
    });
  });

  describe("Route Integration: /my-learning states", () => {
    const MyLearningComponent = Route.options.component!;

    it("State A: renders empty state for new learner with no enrollments", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "u1", name: "Ananya", email: "ananya@jain.edu", role: "learner" },
        role: "learner",
        token: null,
        isSignedIn: true,
      });

      vi.mocked(useAllCourses).mockReturnValue(courses);
      vi.mocked(useLearner).mockReturnValue({
        enrolled: [],
        completed: {},
        last: {},
        accessed: {},
      });

      render(<MyLearningComponent />);

      expect(screen.getByText("Welcome back,")).toBeInTheDocument();
      expect(screen.getByText("Ananya")).toBeInTheDocument();
      expect(screen.getByText("You haven't enrolled in any courses yet")).toBeInTheDocument();
      const pythonLinks = screen.getAllByRole("link", { name: /try python fundamentals/i });
      expect(pythonLinks.length).toBeGreaterThan(0);
      expect(pythonLinks[0]).toHaveAttribute("href", "/courses/python-programming-fundamentals");
      // No spotlight continue card
      expect(screen.queryByLabelText("Continue Learning Spotlight")).not.toBeInTheDocument();
    });

    it("State B: renders in-progress courses and continue learning spotlight", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "u2", name: "Rohan Kumar", email: "rohan@jain.edu", role: "learner" },
        role: "learner",
        token: null,
        isSignedIn: true,
      });

      vi.mocked(useAllCourses).mockReturnValue(courses);
      vi.mocked(useLearner).mockReturnValue({
        enrolled: ["python-programming-fundamentals"],
        completed: {
          "python-programming-fundamentals": ["1-1", "1-2"],
        },
        last: {
          "python-programming-fundamentals": "1-3",
        },
        accessed: {
          "python-programming-fundamentals": Date.now() - 1000 * 60 * 15,
        },
      });

      render(<MyLearningComponent />);

      expect(screen.getByText("Welcome back,")).toBeInTheDocument();
      expect(screen.getByText("Rohan")).toBeInTheDocument();
      expect(screen.getByLabelText("Continue Learning Spotlight")).toBeInTheDocument();
      expect(screen.getByText("In Progress Courses")).toBeInTheDocument();
    });

    it("State C: distinguishes completed courses and provides certificate link", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "u3", name: "Deepak", email: "deepak@jain.edu", role: "learner" },
        role: "learner",
        token: null,
        isSignedIn: true,
      });

      vi.mocked(useAllCourses).mockReturnValue(courses);

      // Complete all 15 lessons of Python course
      const allPythonLessonIds = [
        "1-1",
        "1-2",
        "1-3",
        "2-1",
        "2-2",
        "2-3",
        "3-1",
        "3-2",
        "3-3",
        "4-1",
        "4-2",
        "4-3",
        "4-4",
        "5-1",
        "5-2",
      ];

      vi.mocked(useLearner).mockReturnValue({
        enrolled: ["python-programming-fundamentals"],
        completed: {
          "python-programming-fundamentals": allPythonLessonIds,
        },
        last: {
          "python-programming-fundamentals": "1-1",
        },
        accessed: {
          "python-programming-fundamentals": Date.now(),
        },
      });

      render(<MyLearningComponent />);

      expect(screen.getByText("Completed Courses")).toBeInTheDocument();
      expect(screen.getByText("100% Completed • All lessons finished")).toBeInTheDocument();
      expect(screen.queryByLabelText("Continue Learning Spotlight")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: /explore more courses/i })).toHaveAttribute(
        "href",
        "/courses",
      );
      expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute(
        "href",
        "/learn/python-programming-fundamentals/1-1",
      );
      const certificateLinks = screen.getAllByRole("link", { name: /certificate/i });
      expect(certificateLinks.length).toBeGreaterThan(0);
      expect(certificateLinks[0]).toHaveAttribute("href", "/certificates");
    });

    it("State D: handles missing lesson IDs and missing timestamps without crashing", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: "u4", name: "Meera", email: "meera@jain.edu", role: "learner" },
        role: "learner",
        token: null,
        isSignedIn: true,
      });

      vi.mocked(useAllCourses).mockReturnValue(courses);
      vi.mocked(useLearner).mockReturnValue({
        enrolled: ["python-programming-fundamentals", "data-structures-and-algorithms"],
        completed: {
          "python-programming-fundamentals": ["1-1"],
        },
        last: {
          "python-programming-fundamentals": "99-99",
          "data-structures-and-algorithms": "1-1",
        },
        accessed: {
          "data-structures-and-algorithms": Date.now() - 1000 * 60 * 5,
        },
      });

      render(<MyLearningComponent />);

      expect(screen.getByText("Lesson 99-99")).toBeInTheDocument();
      expect(screen.getAllByText("Big-O Notation").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("5m ago")).toBeInTheDocument();
      expect(screen.getByText("Recently")).toBeInTheDocument();
    });
  });
});
