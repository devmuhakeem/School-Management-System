import { describe, it, expect } from "vitest";
import { examinationService } from "@/services/examination.service";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import { TenantContext } from "@/repositories/types";
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";

describe("Phase 8: Examinations, Assessments, Grading & Results Architecture", () => {
  const examCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-principal-01",
    userRoles: ["PRINCIPAL"],
  };

  const foreignTenantCtx: TenantContext = {
    organizationId: "org-foreign-999",
    campusId: "cmp-foreign-999",
    userId: "u-foreign-999",
    userRoles: ["PRINCIPAL"],
  };

  // ---------------------------------------------------------------------------
  // 1. GRADING SCHEMES & BOUNDARIES
  // ---------------------------------------------------------------------------
  describe("Grading Schemes & Multi-System Boundary Scales", () => {
    it("retrieves configured grading schemes for the tenant", async () => {
      const schemes = await examinationService.getGradingSchemes(examCtx);
      expect(schemes.length).toBeGreaterThanOrEqual(1);

      const defaultScheme = schemes.find((s) => s.isDefault);
      expect(defaultScheme).toBeDefined();
      expect(defaultScheme?.code).toContain("GRADE-WAEC");
      expect(defaultScheme?.boundaries.length).toBe(9); // A1 to F9
    });

    it("correctly resolves scores against WAEC 9-point boundaries", async () => {
      const schemes = await examinationService.getGradingSchemes(examCtx);
      const waecScheme = schemes.find((s) => s.code.includes("WAEC"))!;

      // 95% -> A1 (Distinction, GPA 5.0)
      const resA1 = examinationService.resolveGrade(95, waecScheme);
      expect(resA1.grade).toBe("A1");
      expect(resA1.gradePoint).toBe(5.0);
      expect(resA1.isPassing).toBe(true);

      // 72% -> B2 (Very Good, GPA 4.5)
      const resB2 = examinationService.resolveGrade(72, waecScheme);
      expect(resB2.grade).toBe("B2");
      expect(resB2.gradePoint).toBe(4.5);

      // 52% -> C6 (Credit, GPA 2.5)
      const resC6 = examinationService.resolveGrade(52, waecScheme);
      expect(resC6.grade).toBe("C6");
      expect(resC6.gradePoint).toBe(2.5);

      // 35% -> F9 (Fail, GPA 0.0)
      const resF9 = examinationService.resolveGrade(35, waecScheme);
      expect(resF9.grade).toBe("F9");
      expect(resF9.gradePoint).toBe(0.0);
      expect(resF9.isPassing).toBe(false);
    });

    it("creates a custom grading scheme with validated boundaries", async () => {
      const customScheme = await examinationService.createGradingScheme(examCtx, {
        name: "Primary School Honors Scale",
        code: "GRADE-PRI-HONORS",
        isDefault: false,
        maxGpa: 5.0,
        description: "Three-tier primary achievement scale",
        boundaries: [
          { grade: "HONORS", minScore: 80, maxScore: 100, gradePoint: 5.0, remark: "Honors Distinction", isPassing: true },
          { grade: "CREDIT", minScore: 50, maxScore: 79, gradePoint: 3.5, remark: "Satisfactory Credit", isPassing: true },
          { grade: "NEEDS_IMPROVEMENT", minScore: 0, maxScore: 49, gradePoint: 1.0, remark: "Needs Improvement", isPassing: false },
        ],
      });

      expect(customScheme.id).toBeDefined();
      expect(customScheme.code).toBe("GRADE-PRI-HONORS");

      const resolved = examinationService.resolveGrade(85, customScheme);
      expect(resolved.grade).toBe("HONORS");
    });

    it("rejects grading schemes that do not cover the full 0% to 100% academic range", async () => {
      await expect(
        examinationService.createGradingScheme(examCtx, {
          name: "Incomplete Scheme",
          code: "GRADE-INCOMPLETE",
          isDefault: false,
          maxGpa: 5.0,
          boundaries: [
            { grade: "PASS", minScore: 50, maxScore: 100, gradePoint: 4.0, remark: "Pass", isPassing: true },
            // Missing 0-49% coverage
          ],
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. ASSESSMENT COMPONENT WEIGHTINGS
  // ---------------------------------------------------------------------------
  describe("Assessment Component Configurations & Weight Validations", () => {
    it("retrieves institutional component configurations", async () => {
      const configs = await examinationService.getComponentConfigs(examCtx, "ay-2025-26");
      expect(configs.length).toBeGreaterThanOrEqual(1);

      const totalWeight = configs.reduce((sum, c) => sum + c.weightPercentage, 0);
      expect(totalWeight).toBe(100); // 20% CA1 + 20% CA2 + 60% Exam
    });

    it("enforces that component weights cannot exceed 100%", async () => {
      await expect(
        examinationService.createComponentConfig(examCtx, {
          academicYearId: "ay-2025-26",
          name: "Excessive Third CA",
          code: "CA3-OVERWEIGHT",
          maxMarks: 20,
          weightPercentage: 25, // 100% + 25% = 125% -> Invalid!
          orderIndex: 4,
          isRequired: true,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. EXAM SESSIONS
  // ---------------------------------------------------------------------------
  describe("Examination Sessions Lifecycle", () => {
    it("creates a planned examination session with valid dates", async () => {
      const session = await examinationService.createExamSession(examCtx, {
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        name: "2026 Midterm Progressive Assessments",
        code: "EXAM-2526-MID",
        sessionType: "MID_TERM",
        startDate: "2026-11-01",
        endDate: "2026-11-08",
        instructions: "Continuous invigilation across all classes.",
      });

      expect(session.id).toBeDefined();
      expect(session.status).toBe("PLANNED");
      expect(session.name).toBe("2026 Midterm Progressive Assessments");
    });

    it("rejects an exam session where start date is after end date", async () => {
      await expect(
        examinationService.createExamSession(examCtx, {
          academicYearId: "ay-2025-26",
          name: "Invalid Date Session",
          code: "EXAM-INV-DATE",
          sessionType: "SECOND_TERM",
          startDate: "2026-11-20",
          endDate: "2026-11-10", // Earlier than start date!
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. EXAM SCHEDULES & CONFLICT DETECTION ENGINE
  // ---------------------------------------------------------------------------
  describe("Exam Timetable Schedules & Conflict Detection", () => {
    it("detects Teacher/Invigilator Collision when a teacher is assigned to two exams at the same time", async () => {
      // esch-001 is on 2026-10-12, 09:00-11:00 with primaryInvigilatorId: "stf-002"
      const conflictCheck = await examinationService.checkExamConflicts(examCtx, {
        examSessionId: "sess-2526-t2",
        examDate: "2026-10-12",
        startTime: "09:30", // Overlaps with 09:00 - 11:00
        endTime: "11:30",
        classId: "cls-jss2-2526",
        subjectId: "sub-sci-01",
        primaryInvigilatorId: "stf-002", // Same teacher
      });

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflicts.some((c) => c.type === "TEACHER")).toBe(true);
    });

    it("detects Room Collision when a room is double-booked for the same time window", async () => {
      // esch-001 uses room-101 on 2026-10-12, 09:00-11:00
      const conflictCheck = await examinationService.checkExamConflicts(examCtx, {
        examSessionId: "sess-2526-t2",
        examDate: "2026-10-12",
        startTime: "10:00", // Overlaps
        endTime: "12:00",
        classId: "cls-jss2-2526",
        subjectId: "sub-eng-01",
        roomId: "room-101", // Same room
        primaryInvigilatorId: "stf-003", // Different teacher
      });

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflicts.some((c) => c.type === "ROOM")).toBe(true);
    });

    it("detects Class Clash when a class is scheduled for two exams concurrently", async () => {
      // esch-001 is for cls-jss1-2526 on 2026-10-12, 09:00-11:00
      const conflictCheck = await examinationService.checkExamConflicts(examCtx, {
        examSessionId: "sess-2526-t2",
        examDate: "2026-10-12",
        startTime: "09:00",
        endTime: "11:00",
        classId: "cls-jss1-2526", // Same class!
        subjectId: "sub-ict-01",
        roomId: "room-lab-01", // Different room
        primaryInvigilatorId: "stf-003", // Different teacher
      });

      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflicts.some((c) => c.type === "CLASS")).toBe(true);
    });

    it("successfully creates an examination schedule slot when no collisions exist", async () => {
      const schedule = await examinationService.createExamSchedule(examCtx, {
        examSessionId: "sess-2526-t2",
        subjectId: "sub-soc-01",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        examDate: "2026-10-16", // Free date
        startTime: "09:00",
        endTime: "11:00",
        roomId: "room-101",
        primaryInvigilatorId: "stf-003",
        assistantInvigilatorIds: [],
        maxCapacity: 35,
        notes: "Social Studies Paper 1 & 2",
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.subjectId).toBe("sub-soc-01");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. SCORE ENTRY, BULK GRADING & CORRECTIONS
  // ---------------------------------------------------------------------------
  describe("Marks Entry, Validations & Administrative Corrections", () => {
    it("records marks for enrolled students and calculates percentage and letter grade", async () => {
      const res = await examinationService.bulkRecordScores(examCtx, {
        assessmentId: "asm-math-ca1",
        scores: [
          { studentId: "stu-demo-01", scoreObtained: 19.5, status: "RECORDED", remarks: "Top score" },
          { studentId: "stu-demo-02", scoreObtained: 14.0, status: "RECORDED", remarks: "Satisfactory" },
        ],
      });

      expect(res.savedCount).toBe(2);
      const student1Score = res.records.find((r) => r.studentId === "stu-demo-01");
      expect(student1Score?.scoreObtained).toBe(19.5);
      expect(student1Score?.percentage).toBe(97.5);
      expect(student1Score?.grade).toBe("A1");
    });

    it("rejects score entry that exceeds the maximum configured assessment score", async () => {
      // asm-math-ca1 has maxScore = 20
      await expect(
        examinationService.bulkRecordScores(examCtx, {
          assessmentId: "asm-math-ca1",
          scores: [{ studentId: "stu-demo-01", scoreObtained: 25.0, status: "RECORDED" }], // Over max 20!
        })
      ).rejects.toThrow(ValidationError);
    });

    it("submits a controlled score correction with mandatory justification and audit trail", async () => {
      // Find an existing score record
      const scores = await examinationService.getScoresForAssessment(examCtx, "asm-math-ca1");
      const targetScore = scores[0];
      const originalScore = targetScore.scoreObtained;

      const correction = await examinationService.correctScore(
        examCtx,
        {
          scoreId: targetScore.id,
          newScore: 18.0,
          newStatus: "RECORDED",
          correctionReason: "Re-evaluation of question 4 theory section awarded 1 additional mark.",
        },
        "u-principal-01"
      );

      expect(correction.id).toBeDefined();
      expect(correction.previousScore).toBe(originalScore);
      expect(correction.newScore).toBe(18.0);
      expect(correction.correctionReason).toContain("Re-evaluation");
      expect(correction.correctedById).toBe("u-principal-01");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. RESULTS COMPUTATION & RANKING ENGINE
  // ---------------------------------------------------------------------------
  describe("Term Results Computation, Weighting & Ranking", () => {
    it("computes weighted subject marks, class positions, and term summaries", async () => {
      const results = await examinationService.computeTermResults(examCtx, {
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
      });

      expect(results.subjectResults.length).toBeGreaterThanOrEqual(1);
      expect(results.termSummaries.length).toBe(3);

      // Verify competition ranking (1st, 2nd, 3rd)
      const rank1 = results.termSummaries.find((s) => s.classRank === 1);
      const rank2 = results.termSummaries.find((s) => s.classRank === 2);
      const rank3 = results.termSummaries.find((s) => s.classRank === 3);

      expect(rank1).toBeDefined();
      expect(rank2).toBeDefined();
      expect(rank3).toBeDefined();

      // Highest scorer should be 1st
      expect(rank1!.totalMarksObtained).toBeGreaterThanOrEqual(rank2!.totalMarksObtained);
      expect(rank2!.totalMarksObtained).toBeGreaterThanOrEqual(rank3!.totalMarksObtained);

      // Verify attendance integration
      expect(rank1?.attendanceTotalDays).toBeGreaterThan(0);
      expect(rank1?.attendancePresentDays).toBeGreaterThan(0);
      expect(rank1?.attendancePercentage).toBeGreaterThanOrEqual(90);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. RESULT GOVERNANCE & APPROVAL WORKFLOW
  // ---------------------------------------------------------------------------
  describe("Results Approval Workflow & Locking Protection", () => {
    it("transitions cohort results through the approval pipeline: Submit -> Approve -> Publish -> Lock", async () => {
      // 1. Submit for Review
      const submitRes = await examinationService.reviewResults(
        examCtx,
        {
          academicYearId: "ay-2025-26",
          termId: "term-2025-t2",
          classId: "cls-jss1-2526",
          action: "SUBMIT",
        },
        "u-principal-01"
      );
      expect(submitRes.newStatus).toBe("SUBMITTED");

      // 2. Principal Approve
      const approveRes = await examinationService.reviewResults(
        examCtx,
        {
          academicYearId: "ay-2025-26",
          termId: "term-2025-t2",
          classId: "cls-jss1-2526",
          action: "APPROVE",
          notes: "Approved by Principal Jenkins after academic board review.",
        },
        "u-principal-01"
      );
      expect(approveRes.newStatus).toBe("APPROVED");

      // 3. Publish to Report Cards
      const publishRes = await examinationService.reviewResults(
        examCtx,
        {
          academicYearId: "ay-2025-26",
          termId: "term-2025-t2",
          classId: "cls-jss1-2526",
          action: "PUBLISH",
        },
        "u-principal-01"
      );
      expect(publishRes.newStatus).toBe("PUBLISHED");

      // 4. Lock Results against direct edits
      const lockRes = await examinationService.reviewResults(
        examCtx,
        {
          academicYearId: "ay-2025-26",
          termId: "term-2025-t2",
          classId: "cls-jss1-2526",
          action: "LOCK",
        },
        "u-principal-01"
      );
      expect(lockRes.newStatus).toBe("LOCKED");
    });

    it("prevents direct marks modification when results are locked", async () => {
      await expect(
        examinationService.bulkRecordScores(examCtx, {
          assessmentId: "asm-math-exam",
          scores: [{ studentId: "stu-demo-01", scoreObtained: 58.0, status: "RECORDED" }],
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows unlocking results with administrative authorization", async () => {
      const unlockRes = await examinationService.reviewResults(
        examCtx,
        {
          academicYearId: "ay-2025-26",
          termId: "term-2025-t2",
          classId: "cls-jss1-2526",
          action: "UNLOCK",
          notes: "Administrative unlock authorized for script re-entry.",
        },
        "u-principal-01"
      );
      expect(unlockRes.newStatus).toBe("APPROVED");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. OFFICIAL REPORT CARD & TRANSCRIPT GENERATION
  // ---------------------------------------------------------------------------
  describe("Official Terminal Report Card & Transcript Generation", () => {
    it("generates an official student terminal report card with complete academic and attendance metrics", async () => {
      const reportCard = await examinationService.getStudentReportCard(
        examCtx,
        "stu-demo-01",
        "ay-2025-26",
        "term-2025-t2"
      );

      // 1. Institution Metadata
      expect(reportCard.institution.name).toBe("Apex International Academy");
      expect(reportCard.institution.motto).toBeDefined();

      // 2. Student Identification
      expect(reportCard.student.fullName).toBe("Zainab Al-Mansoor");
      expect(reportCard.student.admissionNumber).toBe("STD/2026/0001");
      expect(reportCard.student.className).toBe("Junior Secondary 1");

      // 3. Subject Performance Breakdown
      expect(reportCard.subjects.length).toBeGreaterThanOrEqual(1);
      const math = reportCard.subjects.find((s) => s.subjectName === "Mathematics");
      expect(math).toBeDefined();
      expect(math?.totalScore).toBeGreaterThanOrEqual(90);
      expect(math?.grade).toBe("A1");
      expect(math?.subjectRank).toBe(1);

      // 4. Term Cumulative Summary
      expect(reportCard.summary.classRank).toBe(1);
      expect(reportCard.summary.averagePercentage).toBeGreaterThanOrEqual(90);
      expect(reportCard.summary.gpa).toBe(5.0);

      // 5. Integrated Attendance
      expect(reportCard.summary.attendanceTotalDays).toBe(60);
      expect(reportCard.summary.attendancePresentDays).toBeGreaterThanOrEqual(56);
      expect(reportCard.summary.attendancePercentage).toBeGreaterThanOrEqual(90);

      // 6. Remarks & Resumption Date
      expect(reportCard.summary.teacherRemarks).toBeDefined();
      expect(reportCard.summary.principalRemarks).toBeDefined();
      expect(reportCard.summary.nextTermResumesDate).toBe("2027-01-11");
    });

    it("throws NotFoundError when requesting a report card for an uncomputed student", async () => {
      await expect(
        examinationService.getStudentReportCard(
          examCtx,
          "stu-nonexistent-999",
          "ay-2025-26",
          "term-2025-t2"
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. MULTI-TENANCY ISOLATION
  // ---------------------------------------------------------------------------
  describe("Multi-Tenancy Isolation", () => {
    it("ensures foreign tenants cannot read exam sessions of another organization", async () => {
      const foreignSessions = await examinationService.getExamSessions(foreignTenantCtx);
      expect(foreignSessions.length).toBe(0);
    });

    it("ensures foreign tenants cannot read grading schemes of another organization", async () => {
      const foreignSchemes = await examinationService.getGradingSchemes(foreignTenantCtx);
      expect(foreignSchemes.length).toBe(0);
    });
  });
});
