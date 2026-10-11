import { describe, it, expect } from "vitest";
import { academicService } from "@/services/academic.service";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import { TenantContext } from "@/repositories/types";
import { ValidationError } from "@/lib/errors";

describe("Phase 6: Academics & Teaching Management Architecture", () => {
  const academicCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const otherOrgCtx: TenantContext = {
    organizationId: "org-foreign-academy-99",
    campusId: "camp-foreign-99",
    userId: "u-foreign-admin-99",
    userRoles: ["School Administrator"],
  };

  // ---------------------------------------------------------------------------
  // 1. Overview & Institutional Statistics
  // ---------------------------------------------------------------------------
  describe("Academic Overview & Institutional Metrics", () => {
    it("returns academic statistics for authenticated institution", async () => {
      const stats = await academicService.getAcademicsOverviewStats(academicCtx);

      expect(stats).toBeDefined();
      expect(stats.curriculumsCount).toBeGreaterThanOrEqual(1);
      expect(stats.streamsCount).toBeGreaterThanOrEqual(1);
      expect(stats.classSubjectsCount).toBeGreaterThanOrEqual(1);
      expect(stats.teachingAssignmentsCount).toBeGreaterThanOrEqual(1);
      expect(stats.periodsCount).toBeGreaterThanOrEqual(1);
      expect(stats.roomsCount).toBeGreaterThanOrEqual(1);
      expect(stats.scheduledLessonsCount).toBeGreaterThanOrEqual(1);
    });

    it("enforces tenant isolation on academic statistics", async () => {
      const stats = await academicService.getAcademicsOverviewStats(otherOrgCtx);
      expect(stats.curriculumsCount).toBe(0);
      expect(stats.streamsCount).toBe(0);
      expect(stats.classSubjectsCount).toBe(0);
      expect(stats.teachingAssignmentsCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Curriculum Frameworks & Versioning
  // ---------------------------------------------------------------------------
  describe("Curriculum Framework Management", () => {
    it("lists default curriculums for the organization", async () => {
      const curriculums = await academicService.getCurriculums(academicCtx);
      expect(curriculums.length).toBeGreaterThanOrEqual(2);
      expect(curriculums.some((c) => c.type === "NATIONAL")).toBe(true);
      expect(curriculums.some((c) => c.type === "CAMBRIDGE")).toBe(true);
    });

    it("allows creating a new curriculum framework with versioning", async () => {
      const newCurr = await academicService.createCurriculum(academicCtx, {
        name: "Montessori Early & Primary Curriculum",
        code: `MONT-${Date.now()}`,
        type: "MONTESSORI",
        version: "1.0",
        description: "Self-directed activity and hands-on collaborative learning.",
        isActive: true,
      });

      expect(newCurr).toBeDefined();
      expect(newCurr.id).toBeDefined();
      expect(newCurr.type).toBe("MONTESSORI");
      expect(newCurr.version).toBe("1.0");

      const list = await academicService.getCurriculums(academicCtx);
      expect(list.some((c) => c.id === newCurr.id)).toBe(true);
    });

    it("filters curriculums by type and search keyword", async () => {
      const searchRes = await academicService.getCurriculums(academicCtx, {
        search: "National",
      });
      expect(searchRes.length).toBeGreaterThanOrEqual(1);
      expect(
        searchRes.every(
          (c) =>
            c.name.toLowerCase().includes("national") ||
            c.code.toLowerCase().includes("nat")
        )
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Subject Combinations & Academic Streams
  // ---------------------------------------------------------------------------
  describe("Subject Combinations & Academic Streams", () => {
    it("retrieves configured streams for campus", async () => {
      const streams = await academicService.getSubjectCombinations(academicCtx);
      expect(streams.length).toBeGreaterThanOrEqual(2);
      expect(streams.some((s) => s.stream === "Science")).toBe(true);
      expect(streams.some((s) => s.stream === "Arts")).toBe(true);
    });

    it("allows creating a technical vocational stream with compulsory subjects", async () => {
      const newStream = await academicService.createSubjectCombination(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Technical & Applied Engineering Stream",
        code: `TECH-ENG-${Date.now()}`,
        stream: "Technical",
        description: "Drafting, electronics, mechanical physics, and workshop practice.",
        compulsorySubjectIds: ["sub-001", "sub-004"], // Math, Physics
        electiveSubjectIds: ["sub-003"], // Chemistry
        isActive: true,
      });

      expect(newStream).toBeDefined();
      expect(newStream.code).toContain("TECH-ENG");
      expect(newStream.compulsorySubjectIds).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Class Subject Allocations & Rules
  // ---------------------------------------------------------------------------
  describe("Class Subject Allocations (Core, Elective, Optional)", () => {
    it("retrieves class subject allocations", async () => {
      const allocations = await academicService.getClassSubjects(academicCtx, {
        classId: "cls-jss1-2526",
      });

      expect(allocations.length).toBeGreaterThanOrEqual(2);
      expect(allocations.some((a) => a.ruleType === "CORE")).toBe(true);
    });

    it("allocates a new elective subject to a class with credit units and periods per week", async () => {
      const allocation = await academicService.allocateSubjectToClass(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-ss2-2526",
        sectionId: "sec-ss2-sci",
        subjectId: "sub-005", // Biology
        ruleType: "ELECTIVE",
        creditUnits: 3,
        periodsPerWeek: 4,
        syllabusNotes: "Genetics and ecological systems curriculum",
        isActive: true,
      });

      expect(allocation).toBeDefined();
      expect(allocation.ruleType).toBe("ELECTIVE");
      expect(allocation.periodsPerWeek).toBe(4);
      expect(allocation.creditUnits).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Faculty Teaching Assignments & Class Teachers
  // ---------------------------------------------------------------------------
  describe("Faculty Teaching Assignments & Class Teachers", () => {
    it("retrieves active faculty assignments", async () => {
      const assignments = await academicService.getTeachingAssignments(academicCtx, {
        staffId: "stf-001",
      });

      expect(assignments.length).toBeGreaterThanOrEqual(1);
      expect(assignments[0].staffId).toBe("stf-001");
    });

    it("creates a faculty assignment to teach a subject in a specific section", async () => {
      const assignment = await academicService.createTeachingAssignment(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        staffId: "stf-003", // Grace Hopper
        subjectId: "sub-004", // Physics
        classId: "cls-ss2-2526",
        sectionId: "sec-ss2-sci",
        periodsPerWeek: 5,
      });

      expect(assignment).toBeDefined();
      expect(assignment.staffId).toBe("stf-003");
      expect(assignment.subjectId).toBe("sub-004");
    });

    it("supports assigning a designated Class Teacher or Form Teacher to a section", async () => {
      const result = await academicService.assignClassTeacher(academicCtx, {
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        staffId: "stf-001",
        roleTitle: "FORM_TEACHER",
      });

      expect(result.success).toBe(true);
      expect(result.staffId).toBe("stf-001");
      expect(result.roleTitle).toBe("FORM_TEACHER");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Teacher Workload Calculations
  // ---------------------------------------------------------------------------
  describe("Teacher Workload Analytics Engine", () => {
    it("computes weekly periods, class count, distinct subjects, and workload status", async () => {
      const workload = await academicService.getTeacherWorkload(academicCtx, "stf-001");

      expect(workload).toBeDefined();
      expect(workload.length).toBeGreaterThanOrEqual(1);

      const teacherLoad = workload[0];
      expect(teacherLoad.staffId).toBe("stf-001");
      expect(teacherLoad.weeklyPeriods).toBeGreaterThanOrEqual(5);
      expect(teacherLoad.classCount).toBeGreaterThanOrEqual(1);
      expect(teacherLoad.subjectCount).toBeGreaterThanOrEqual(1);
      expect(["UNDERLOADED", "OPTIMAL", "OVERLOADED"]).toContain(teacherLoad.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Bell Schedule & Lesson Periods
  // ---------------------------------------------------------------------------
  describe("Lesson Periods & Bell Schedule", () => {
    it("retrieves ordered periods for the campus", async () => {
      const periods = await academicService.getLessonPeriods(academicCtx);
      expect(periods.length).toBeGreaterThanOrEqual(4);

      for (let i = 0; i < periods.length - 1; i++) {
        expect(periods[i].periodNumber).toBeLessThanOrEqual(periods[i + 1].periodNumber);
      }
    });

    it("creates a new afternoon period", async () => {
      const period = await academicService.createLessonPeriod(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 10,
        name: "Period 10 (Remedial & Tutorials)",
        startTime: "16:00",
        endTime: "16:45",
        isBreak: false,
        daysActive: ["MONDAY", "WEDNESDAY"],
      });

      expect(period).toBeDefined();
      expect(period.periodNumber).toBe(10);
      expect(period.isBreak).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Classroom & Facility Foundations
  // ---------------------------------------------------------------------------
  describe("Classroom & Facility Management", () => {
    it("retrieves rooms and facilities for campus", async () => {
      const rooms = await academicService.getRooms(academicCtx);
      expect(rooms.length).toBeGreaterThanOrEqual(3);
      expect(rooms.some((r) => r.roomType === "SCIENCE_LAB")).toBe(true);
      expect(rooms.some((r) => r.roomType === "ICT_LAB")).toBe(true);
    });

    it("creates a new specialized classroom facility", async () => {
      const room = await academicService.createRoom(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Advanced Robotics Workshop",
        code: `ROBOT-${Date.now()}`,
        building: "Innovation Wing",
        roomType: "WORKSHOP",
        capacity: 25,
        isAvailable: true,
      });

      expect(room).toBeDefined();
      expect(room.roomType).toBe("WORKSHOP");
      expect(room.capacity).toBe(25);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Timetable Foundation & Conflict Detection Engine
  // ---------------------------------------------------------------------------
  describe("Timetable Matrix & Conflict Detection", () => {
    it("detects Teacher Conflict when teacher is double-booked for the same period and day", async () => {
      // In seed: stf-001 teaches sub-001 to cls-jss1-2526 on MONDAY in per-001
      const conflictCheck = await academicService.checkTimetableConflicts(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        dayOfWeek: "MONDAY",
        periodId: "per-001",
        staffId: "stf-001", // Already booked!
        classId: "cls-ss2-2526",
        sectionId: "sec-ss2-sci",
      });

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflicts.some((c) => c.type === "TEACHER")).toBe(true);
    });

    it("detects Room Conflict when a classroom is double-booked in the same period", async () => {
      // In seed: rm-101 is booked for cls-jss1-2526 on MONDAY in per-001
      const conflictCheck = await academicService.checkTimetableConflicts(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        dayOfWeek: "MONDAY",
        periodId: "per-001",
        staffId: "stf-003", // Different teacher
        classId: "cls-ss2-2526", // Different class
        roomId: "rm-101", // Occupied room!
      });

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflicts.some((c) => c.type === "ROOM")).toBe(true);
    });

    it("detects Class Conflict when a class is double-booked with two subjects in the same period", async () => {
      const conflictCheck = await academicService.checkTimetableConflicts(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        dayOfWeek: "MONDAY",
        periodId: "per-001",
        staffId: "stf-002",
        classId: "cls-jss1-2526", // Already scheduled in per-001!
      });

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflicts.some((c) => c.type === "CLASS")).toBe(true);
    });

    it("rejects creating a lesson that has conflicts with ValidationError", async () => {
      await expect(
        academicService.createTimetableLesson(academicCtx, {
          campusId: DEMO_CAMPUS_MAIN_ID,
          academicYearId: "ay-2025-26",
          dayOfWeek: "MONDAY",
          periodId: "per-001",
          subjectId: "sub-002",
          staffId: "stf-001", // Teacher collision
          classId: "cls-jss1-2526",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("succeeds creating a lesson when no collisions exist", async () => {
      const lesson = await academicService.createTimetableLesson(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        dayOfWeek: "FRIDAY",
        periodId: "per-004",
        subjectId: "sub-004", // Physics
        staffId: "stf-003", // Grace Hopper
        classId: "cls-ss2-2526",
        sectionId: "sec-ss2-sci",
        roomId: "room-002", // Science lab
      });

      expect(lesson).toBeDefined();
      expect(lesson.id).toBeDefined();
      expect(lesson.dayOfWeek).toBe("FRIDAY");
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Teaching Groups (Cohorts)
  // ---------------------------------------------------------------------------
  describe("Teaching Groups (Cohorts)", () => {
    it("creates a collaborative teaching group for attendance and grading foundation", async () => {
      const tg = await academicService.createTeachingGroup(academicCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-001",
        staffId: "stf-001",
        name: "Junior Math Scholars Group A",
        code: `TG-JMATH-${Date.now()}`,
        maxCapacity: 35,
      });

      expect(tg).toBeDefined();
      expect(tg.name).toContain("Junior Math Scholars");
      expect(tg.maxCapacity).toBe(35);

      const list = await academicService.getTeachingGroups(academicCtx, {
        classId: "cls-jss1-2526",
      });
      expect(list.some((item) => item.id === tg.id)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Student Subject Inheritance
  // ---------------------------------------------------------------------------
  describe("Student Subject Inheritance", () => {
    it("computes inherited subjects based on student class and stream allocations", async () => {
      const inheritance = await academicService.getStudentInheritedSubjects(
        academicCtx,
        "stu-demo-01"
      );

      expect(inheritance).toBeDefined();
      expect(inheritance.studentId).toBe("stu-demo-01");
      expect(inheritance.inheritedSubjects.length).toBeGreaterThanOrEqual(1);
      expect(inheritance.inheritedSubjects[0].subjectId).toBeDefined();
    });
  });
});
