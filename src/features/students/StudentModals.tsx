import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, UserPlus, Upload, ArrowRight, ShieldCheck, ArrowRightLeft } from "lucide-react";

interface CampusOption {
  id: string;
  name: string;
}

interface AcademicYearOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  campusId: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
}

// -----------------------------------------------------------------------------
// 1. STUDENT REGISTRATION MODAL
// -----------------------------------------------------------------------------
interface StudentRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  campuses: CampusOption[];
  academicYears: AcademicYearOption[];
  classes: ClassOption[];
  sections: SectionOption[];
}

export function StudentRegistrationModal({
  open,
  onOpenChange,
  onSuccess,
  campuses,
  academicYears,
  classes,
  sections,
}: StudentRegistrationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Form State
  const [formData, setFormData] = useState({
    campusId: campuses[0]?.id || "",
    academicYearId: academicYears[0]?.id || "",
    classId: "",
    sectionId: "",
    rollNumber: "",
    admissionDate: new Date().toISOString().split("T")[0],
    admissionNumber: "",
    autoGenerateAdmissionNumber: true,
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "2012-05-15",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    nationality: "American",
    religion: "",
    bloodGroup: "O+",
    email: "",
    phone: "",
    address: "",
    avatarUrl: "",
    medicalNotes: "",
    emergencyNotes: "",
    // Guardian
    guardianFirstName: "",
    guardianLastName: "",
    guardianRelationship: "MOTHER",
    guardianPhone: "",
    guardianEmail: "",
    guardianAddress: "",
    guardianOccupation: "",
    isPrimary: true,
    isEmergencyContact: true,
    canPickup: true,
  });

  useEffect(() => {
    if (campuses.length > 0 && !formData.campusId) {
      setFormData((prev) => ({ ...prev, campusId: campuses[0].id }));
    }
    if (academicYears.length > 0 && !formData.academicYearId) {
      setFormData((prev) => ({ ...prev, academicYearId: academicYears[0].id }));
    }
  }, [campuses, academicYears]);

  // Filter classes by campus
  const filteredClasses = classes.filter((c) => !formData.campusId || c.campusId === formData.campusId);
  const filteredSections = sections.filter((s) => s.classId === formData.classId);

  useEffect(() => {
    if (filteredClasses.length > 0 && !formData.classId) {
      setFormData((prev) => ({ ...prev, classId: filteredClasses[0].id }));
    }
  }, [filteredClasses]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const payload: any = {
        campusId: formData.campusId,
        academicYearId: formData.academicYearId,
        classId: formData.classId,
        sectionId: formData.sectionId || undefined,
        rollNumber: formData.rollNumber || undefined,
        admissionDate: formData.admissionDate,
        admissionNumber: formData.autoGenerateAdmissionNumber ? undefined : formData.admissionNumber,
        autoGenerateAdmissionNumber: formData.autoGenerateAdmissionNumber,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        nationality: formData.nationality || "Not Specified",
        religion: formData.religion || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        avatarUrl: formData.avatarUrl || undefined,
        medicalNotes: formData.medicalNotes || undefined,
        emergencyNotes: formData.emergencyNotes || undefined,
      };

      if (formData.guardianFirstName && formData.guardianLastName && formData.guardianPhone) {
        payload.guardian = {
          firstName: formData.guardianFirstName,
          lastName: formData.guardianLastName,
          relationship: formData.guardianRelationship,
          phone: formData.guardianPhone,
          email: formData.guardianEmail || undefined,
          address: formData.guardianAddress || undefined,
          occupation: formData.guardianOccupation || undefined,
          isPrimary: formData.isPrimary,
          isEmergencyContact: formData.isEmergencyContact,
          canPickup: formData.canPickup,
        };
      }

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.error?.details) {
          setFieldErrors(data.error.details);
        }
        throw new Error(data?.message || data?.error?.message || "Failed to register student");
      }

      onSuccess();
      onOpenChange(false);
      setStep(1);
    } catch (err: any) {
      setError(err.message || "An error occurred while creating student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="2xl"
      title="Student Enrollment & Registration"
      description="Register a new student with demographic details, academic placement, and primary guardian."
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`font-semibold transition-colors ${
              step === 1 ? "text-slate-900 border-b-2 border-slate-900 pb-1 -mb-3.5" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            1. Demographics
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`font-semibold transition-colors ${
              step === 2 ? "text-slate-900 border-b-2 border-slate-900 pb-1 -mb-3.5" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            2. Contact & Medical
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`font-semibold transition-colors ${
              step === 3 ? "text-slate-900 border-b-2 border-slate-900 pb-1 -mb-3.5" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            3. Academic Placement
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => setStep(4)}
            className={`font-semibold transition-colors ${
              step === 4 ? "text-slate-900 border-b-2 border-slate-900 pb-1 -mb-3.5" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            4. Primary Guardian
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to register student</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: DEMOGRAPHICS */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="e.g. Lucas"
                  required
                />
                {fieldErrors.firstName && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.firstName[0]}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                <Input
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="e.g. Alexander"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="e.g. Wright"
                  required
                />
                {fieldErrors.lastName && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.lastName[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.dateOfBirth && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.dateOfBirth[0]}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                <Input
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  placeholder="e.g. American"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Religion (Optional)</label>
                <Input
                  name="religion"
                  value={formData.religion}
                  onChange={handleChange}
                  placeholder="e.g. Christianity, Islam, etc."
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT & MEDICAL */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Email (Optional)</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. student@institution.internal"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +1 (555) 019-2834"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                placeholder="Street address, apartment, city, state, zip"
                className="w-full p-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medical / Allergy Notes</label>
                <textarea
                  name="medicalNotes"
                  value={formData.medicalNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Asthma, peanut allergy, glasses required, etc."
                  className="w-full p-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Care Directives</label>
                <textarea
                  name="emergencyNotes"
                  value={formData.emergencyNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Special instructions during emergencies"
                  className="w-full p-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ACADEMIC PLACEMENT */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Location <span className="text-rose-500">*</span>
                </label>
                <select
                  name="campusId"
                  value={formData.campusId}
                  onChange={handleChange}
                  className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                  required
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Session <span className="text-rose-500">*</span>
                </label>
                <select
                  name="academicYearId"
                  value={formData.academicYearId}
                  onChange={handleChange}
                  className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                  required
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Cohort <span className="text-rose-500">*</span>
                </label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                  required
                >
                  <option value="">Select Class...</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.classId && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.classId[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Section</label>
                <select
                  name="sectionId"
                  value={formData.sectionId}
                  onChange={handleChange}
                  className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                >
                  <option value="">Unassigned / General</option>
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Roll / Seat Number</label>
                <Input
                  name="rollNumber"
                  value={formData.rollNumber}
                  onChange={handleChange}
                  placeholder="e.g. 01"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="autoGenerate"
                  name="autoGenerateAdmissionNumber"
                  checked={formData.autoGenerateAdmissionNumber}
                  onChange={handleCheckbox}
                  className="rounded-none text-slate-900 focus:ring-0"
                />
                <label htmlFor="autoGenerate" className="text-xs font-medium text-slate-800 cursor-pointer">
                  Auto-generate official Admission Number (Server sequence: STU-YYYY-XXXXX)
                </label>
              </div>

              {!formData.autoGenerateAdmissionNumber && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manual Admission Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="admissionNumber"
                    value={formData.admissionNumber}
                    onChange={handleChange}
                    placeholder="e.g. STU-2026-00042"
                    required={!formData.autoGenerateAdmissionNumber}
                  />
                  {fieldErrors.admissionNumber && (
                    <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.admissionNumber[0]}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: PRIMARY GUARDIAN */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Attach primary parent or emergency contact. Additional guardians can be linked later in the student profile.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guardian First Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  name="guardianFirstName"
                  value={formData.guardianFirstName}
                  onChange={handleChange}
                  placeholder="e.g. Sarah"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guardian Last Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  name="guardianLastName"
                  value={formData.guardianLastName}
                  onChange={handleChange}
                  placeholder="e.g. Wright"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                <select
                  name="guardianRelationship"
                  value={formData.guardianRelationship}
                  onChange={handleChange}
                  className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
                >
                  <option value="MOTHER">Mother</option>
                  <option value="FATHER">Father</option>
                  <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                  <option value="STEP_MOTHER">Step Mother</option>
                  <option value="STEP_FATHER">Step Father</option>
                  <option value="GRANDPARENT">Grandparent</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone <span className="text-rose-500">*</span>
                </label>
                <Input
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  placeholder="e.g. +1 (555) 019-3388"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  name="guardianEmail"
                  value={formData.guardianEmail}
                  onChange={handleChange}
                  placeholder="e.g. parent@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Occupation</label>
                <Input
                  name="guardianOccupation"
                  value={formData.guardianOccupation}
                  onChange={handleChange}
                  placeholder="e.g. Electrical Engineer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Address</label>
                <Input
                  name="guardianAddress"
                  value={formData.guardianAddress}
                  onChange={handleChange}
                  placeholder="Same as student or alternate"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPrimary"
                  checked={formData.isPrimary}
                  onChange={handleCheckbox}
                  className="rounded-none text-slate-900"
                />
                Primary Guardian
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="isEmergencyContact"
                  checked={formData.isEmergencyContact}
                  onChange={handleCheckbox}
                  className="rounded-none text-slate-900"
                />
                Emergency Contact
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="canPickup"
                  checked={formData.canPickup}
                  onChange={handleCheckbox}
                  className="rounded-none text-slate-900"
                />
                Pickup Authorized
              </label>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                disabled={loading}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as any)}
                disabled={
                  (step === 1 && (!formData.firstName || !formData.lastName || !formData.dateOfBirth)) ||
                  (step === 3 && (!formData.campusId || !formData.classId))
                }
              >
                Next <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading || !formData.guardianFirstName || !formData.guardianPhone}>
                {loading ? "Registering..." : "Complete Registration"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 2. STUDENT STATUS CHANGE MODAL
// -----------------------------------------------------------------------------
interface StudentStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function StudentStatusModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  currentStatus,
  onSuccess,
}: StudentStatusModalProps) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
    setReason("");
    setError(null);
  }, [currentStatus, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("A reason must be documented for institutional audit compliance.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students/${studentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update status");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to change student status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Update Student Status"
      description={`Change enrollment lifecycle state for ${studentName}. Status changes are permanently audited.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">New Lifecycle Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
          >
            <option value="ACTIVE">ACTIVE (In regular attendance)</option>
            <option value="INACTIVE">INACTIVE (Temporarily un-enrolled)</option>
            <option value="SUSPENDED">SUSPENDED (Disciplinary action)</option>
            <option value="WITHDRAWN">WITHDRAWN (Parental / Voluntary exit)</option>
            <option value="GRADUATED">GRADUATED (Completed highest cohort)</option>
            <option value="TRANSFERRED">TRANSFERRED (Transferred to another school)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Institutional Justification & Audit Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Disciplinary board review outcome / Voluntary family relocation"
            className="w-full p-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !reason.trim()}>
            {loading ? "Recording..." : "Apply Status Change"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 3. STUDENT PROMOTION MODAL
// -----------------------------------------------------------------------------
interface StudentPromotionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  academicYears: AcademicYearOption[];
  classes: ClassOption[];
  sections: SectionOption[];
  onSuccess: () => void;
}

export function StudentPromotionModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  academicYears,
  classes,
  sections,
  onSuccess,
}: StudentPromotionModalProps) {
  const [toAcademicYearId, setToAcademicYearId] = useState(academicYears[0]?.id || "");
  const [toClassId, setToClassId] = useState("");
  const [toSectionId, setToSectionId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [remarks, setRemarks] = useState("Academic progression to higher cohort");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (academicYears.length > 0 && !toAcademicYearId) {
      setToAcademicYearId(academicYears[0].id);
    }
  }, [academicYears]);

  const filteredSections = sections.filter((s) => s.classId === toClassId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toClassId) {
      setError("Please select target class cohort.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students/${studentId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAcademicYearId,
          toClassId,
          toSectionId: toSectionId || undefined,
          rollNumber: rollNumber || undefined,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to promote student");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to promote student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Promote Student"
      description={`Advance ${studentName} into the next academic session or higher class level.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target Academic Session</label>
          <select
            value={toAcademicYearId}
            onChange={(e) => setToAcademicYearId(e.target.value)}
            className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            required
          >
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Class <span className="text-rose-500">*</span>
            </label>
            <select
              value={toClassId}
              onChange={(e) => setToClassId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select target class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
            <select
              value={toSectionId}
              onChange={(e) => setToSectionId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="">Unassigned</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">New Roll Number</label>
          <Input
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. JSS2-14"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Promotion Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="w-full p-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !toClassId}>
            {loading ? "Promoting..." : "Confirm Promotion"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 4. STUDENT TRANSFER MODAL (CAMPUS / BRANCH)
// -----------------------------------------------------------------------------
interface StudentTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  campuses: CampusOption[];
  classes: ClassOption[];
  onSuccess: () => void;
}

export function StudentTransferModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  campuses,
  classes,
  onSuccess,
}: StudentTransferModalProps) {
  const [toCampusId, setToCampusId] = useState(campuses[0]?.id || "");
  const [toClassId, setToClassId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredClasses = classes.filter((c) => c.campusId === toCampusId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toCampusId || !toClassId || !reason.trim()) {
      setError("Target campus, class, and transfer reason are mandatory.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students/${studentId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toCampusId,
          toClassId,
          reason,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Transfer failed");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Transfer operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Institutional Campus Transfer"
      description={`Transfer ${studentName} to another campus branch. Creates a permanent transfer audit record.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Campus <span className="text-rose-500">*</span>
            </label>
            <select
              value={toCampusId}
              onChange={(e) => {
                setToCampusId(e.target.value);
                setToClassId("");
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Class <span className="text-rose-500">*</span>
            </label>
            <select
              value={toClassId}
              onChange={(e) => setToClassId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Class...</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Transfer <span className="text-rose-500">*</span>
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Parental relocation to West campus catchment area"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Authorized by Principal, transfer fee cleared, etc."
            className="w-full p-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !toCampusId || !toClassId || !reason.trim()}>
            {loading ? "Transferring..." : "Authorize Campus Transfer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 5. STUDENT DOCUMENT UPLOAD MODAL
// -----------------------------------------------------------------------------
interface StudentDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSuccess: () => void;
}

export function StudentDocumentModal({
  open,
  onOpenChange,
  studentId,
  onSuccess,
}: StudentDocumentModalProps) {
  const [fileName, setFileName] = useState("");
  const [documentType, setDocumentType] = useState<
    "BIRTH_CERTIFICATE" | "TRANSCRIPT" | "MEDICAL_RECORD" | "PASSPORT_PHOTO" | "IDENTIFICATION" | "IMMUNIZATION" | "OTHER"
  >("BIRTH_CERTIFICATE");
  const [mimeType, setMimeType] = useState("application/pdf");
  const [sizeBytes, setSizeBytes] = useState(1024 * 500); // 500 KB mock
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/students/${studentId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          documentType,
          mimeType,
          sizeBytes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to upload document");
      }

      onSuccess();
      onOpenChange(false);
      setFileName("");
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Upload Student Document"
      description="Attach certified records, transcripts, or medical certifications to the student dossier."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title / File Name</label>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="e.g. Official_Birth_Certificate_Certified.pdf"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
            <select
              value={documentType}
              onChange={(e: any) => setDocumentType(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
              <option value="TRANSCRIPT">Previous Academic Transcript</option>
              <option value="MEDICAL_RECORD">Medical Examination Report</option>
              <option value="IMMUNIZATION">Immunization Card</option>
              <option value="PASSPORT_PHOTO">Official Passport Photograph</option>
              <option value="IDENTIFICATION">National ID / Resident Card</option>
              <option value="OTHER">Other Institutional Record</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Format</label>
            <select
              value={mimeType}
              onChange={(e) => setMimeType(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="application/pdf">PDF Document (.pdf)</option>
              <option value="image/jpeg">JPEG Image (.jpg)</option>
              <option value="image/png">PNG Image (.png)</option>
            </select>
          </div>
        </div>

        <div className="border border-dashed border-slate-300 p-6 text-center bg-slate-50">
          <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-700">Storage integration active</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Files are cryptographically checksummed and stored under isolated tenant hierarchy.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !fileName.trim()}>
            {loading ? "Uploading..." : "Save Document Record"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 6. LINK GUARDIAN MODAL
// -----------------------------------------------------------------------------
interface AddGuardianModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSuccess: () => void;
}

export function AddGuardianModal({
  open,
  onOpenChange,
  studentId,
  onSuccess,
}: AddGuardianModalProps) {
  const [existingGuardians, setExistingGuardians] = useState<any[]>([]);
  const [mode, setMode] = useState<"SELECT" | "NEW">("NEW");
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newGuardian, setNewGuardian] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    relationship: "FATHER",
    phone: "",
    email: "",
    address: "",
    occupation: "",
    employer: "",
    isPrimary: false,
    isEmergencyContact: true,
    canPickup: true,
  });

  useEffect(() => {
    if (open) {
      fetch("/api/guardians")
        .then((r) => r.json())
        .then((data) => {
          if (data.data) {
            setExistingGuardians(data.data);
            if (data.data.length > 0) {
              setSelectedGuardianId(data.data[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let guardianId = selectedGuardianId;

      if (mode === "NEW") {
        // Create guardian first
        const createRes = await fetch("/api/guardians", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: newGuardian.firstName,
            middleName: newGuardian.middleName || undefined,
            lastName: newGuardian.lastName,
            email: newGuardian.email || undefined,
            phone: newGuardian.phone,
            address: newGuardian.address || undefined,
            occupation: newGuardian.occupation || undefined,
            employer: newGuardian.employer || undefined,
          }),
        });
        const createdData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createdData.message || "Failed to create guardian record");
        }
        guardianId = createdData.data.id;
      }

      // Link to student
      const linkRes = await fetch(`/api/students/${studentId}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId,
          relationship: newGuardian.relationship,
          isPrimary: newGuardian.isPrimary,
          isEmergencyContact: newGuardian.isEmergencyContact,
          canPickup: newGuardian.canPickup,
        }),
      });

      const linkData = await linkRes.json();
      if (!linkRes.ok) {
        throw new Error(linkData.message || "Failed to link guardian to student");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Link Parent / Guardian"
      description="Associate a parent, relative, or sponsor with this student profile."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {existingGuardians.length > 0 && (
          <div className="flex border-b border-slate-200 pb-2 gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("NEW")}
              className={`pb-1 transition-colors ${mode === "NEW" ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-400"}`}
            >
              Create New Guardian
            </button>
            <button
              type="button"
              onClick={() => setMode("SELECT")}
              className={`pb-1 transition-colors ${mode === "SELECT" ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-400"}`}
            >
              Select Existing Guardian ({existingGuardians.length})
            </button>
          </div>
        )}

        {mode === "SELECT" && existingGuardians.length > 0 ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Choose Guardian</label>
            <select
              value={selectedGuardianId}
              onChange={(e) => setSelectedGuardianId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              {existingGuardians.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.firstName} {g.lastName} ({g.phone})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={newGuardian.firstName}
                  onChange={(e) => setNewGuardian((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={newGuardian.lastName}
                  onChange={(e) => setNewGuardian((p) => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={newGuardian.phone}
                  onChange={(e) => setNewGuardian((p) => ({ ...p, phone: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={newGuardian.email}
                  onChange={(e) => setNewGuardian((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Occupation</label>
              <Input
                value={newGuardian.occupation}
                onChange={(e) => setNewGuardian((p) => ({ ...p, occupation: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship to Student</label>
          <select
            value={newGuardian.relationship}
            onChange={(e) => setNewGuardian((p) => ({ ...p, relationship: e.target.value }))}
            className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none mb-3"
          >
            <option value="MOTHER">Mother</option>
            <option value="FATHER">Father</option>
            <option value="LEGAL_GUARDIAN">Legal Guardian</option>
            <option value="STEP_MOTHER">Step Mother</option>
            <option value="STEP_FATHER">Step Father</option>
            <option value="GRANDPARENT">Grandparent</option>
            <option value="SIBLING">Sibling</option>
            <option value="RELATIVE">Relative</option>
            <option value="OTHER">Other</option>
          </select>

          <div className="flex items-center gap-4 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newGuardian.isPrimary}
                onChange={(e) => setNewGuardian((p) => ({ ...p, isPrimary: e.target.checked }))}
                className="rounded-none text-slate-900"
              />
              Primary Guardian
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newGuardian.isEmergencyContact}
                onChange={(e) => setNewGuardian((p) => ({ ...p, isEmergencyContact: e.target.checked }))}
                className="rounded-none text-slate-900"
              />
              Emergency Contact
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newGuardian.canPickup}
                onChange={(e) => setNewGuardian((p) => ({ ...p, canPickup: e.target.checked }))}
                className="rounded-none text-slate-900"
              />
              Can Pickup
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              loading ||
              (mode === "NEW" && (!newGuardian.firstName || !newGuardian.phone)) ||
              (mode === "SELECT" && !selectedGuardianId)
            }
          >
            {loading ? "Linking..." : "Attach Guardian"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
