// lib/patients.ts

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  allergies: string[];
  history: {
    date: string;
    title: string;
    details: string;
  }[];
  imaging: {
    id: string;
    type: string;
    date: string;
    color: string;
    path: string;
  }[];
  slitLamp: {
    od: string;
    os: string;
  };
  refraction: {
    od: { sphere: string; cylinder: string; axis: string };
    os: { sphere: string; cylinder: string; axis: string };
  };
  previousRefraction?: {
    date: string;
    od: { sphere: string; cylinder: string; axis: string };
    os: { sphere: string; cylinder: string; axis: string };
  };
  diagnosis: string;
}

const mockPatients: Record<string, PatientRecord> = {
  "123": {
    id: "123",
    name: "Margaret Chen",
    age: 68,
    gender: "F",
    mrn: "#20458712",
    allergies: ["Penicillin Allergy", "Sulfa Allergy"],
    history: [
      { date: "08/15/2026", title: "Annual Eye Exam", details: "VA 20/25 OD, 20/30 OS. Stable visual fields. Refraction checked." },
      { date: "03/02/2026", title: "Follow-up: Glaucoma Suspect", details: "IOP 18 mmHg OD, 19 mmHg OS. C/D ratio stable at 0.55 OU." }
    ],
    imaging: [
      { id: "img-1", type: "OCT Macula OD", date: "08/15/2026", color: "text-rose-500", path: "M0,45 Q25,10 50,25 T100,5" },
      { id: "img-2", type: "OCT RNFL OS", date: "08/15/2026", color: "text-emerald-400", path: "M0,10 Q35,40 60,15 T100,30" }
    ],
    slitLamp: {
      od: "Clear, no staining",
      os: "Clear, no staining"
    },
    refraction: {
      od: { sphere: "-2.25", cylinder: "-0.75", axis: "180" },
      os: { sphere: "-1.75", cylinder: "-0.50", axis: "005" }
    },
    previousRefraction: {
      date: "03/02/2026",
      od: { sphere: "-2.00", cylinder: "-0.50", axis: "180" },
      os: { sphere: "-1.50", cylinder: "-0.50", axis: "005" }
    },
    diagnosis: "Glaucoma Suspect (ICD-10: H40.00) & Trace Nuclear Sclerosis"
  },
  "456": {
    id: "456",
    name: "James Adebayo",
    age: 45,
    gender: "M",
    mrn: "#20459833",
    allergies: ["Aspirin Allergy"],
    history: [
      { date: "07/10/2026", title: "Initial Consultation", details: "Complaints of blurred distance vision. Keratometry normal." }
    ],
    imaging: [
      { id: "img-3", type: "Corneal Topography", date: "07/10/2026", color: "text-blue-400", path: "M0,25 Q50,5 100,25" }
    ],
    slitLamp: {
      od: "Mild superficial punctate keratitis",
      os: "Quiet, clear"
    },
    refraction: {
      od: { sphere: "-1.00", cylinder: "-0.25", axis: "090" },
      os: { sphere: "-0.75", cylinder: "0.00", axis: "000" }
    },
    previousRefraction: {
      date: "01/15/2026",
      od: { sphere: "-0.75", cylinder: "0.00", axis: "000" },
      os: { sphere: "-0.50", cylinder: "0.00", axis: "000" }
    },
    diagnosis: "Myopic Astigmatism (ICD-10: H52.2)"
  },
  "PAT-2026-089": {
    id: "PAT-2026-089",
    name: "Amina Bello",
    age: 34,
    gender: "F",
    mrn: "#PAT-2026-089",
    allergies: ["No Known Allergies"],
    history: [
      { date: "09/05/2026", title: "Triage & Vitals", details: "Patient reported eye strain and difficulty reading small print." }
    ],
    imaging: [
      { id: "img-[#PAT-2026-089]-1", type: "OCT Macula OD", date: "09/05/2026", color: "text-rose-500", path: "M0,45 Q25,10 50,25 T100,5" },
      { id: "img-[#PAT-2026-089]-2", type: "OCT RNFL OS", date: "09/05/2026", color: "text-emerald-400", path: "M0,10 Q35,40 60,15 T100,30" }
    ],
    slitLamp: {
      od: "Clear anterior chamber",
      os: "Normal tear film"
    },
    refraction: {
      od: { sphere: "-1.50", cylinder: "-0.50", axis: "090" },
      os: { sphere: "-1.25", cylinder: "-0.25", axis: "180" }
    },
    previousRefraction: {
      date: "02/10/2025",
      od: { sphere: "-1.25", cylinder: "-0.25", axis: "090" },
      os: { sphere: "-1.00", cylinder: "0.00", axis: "180" }
    },
    diagnosis: "Simple Myopia (ICD-10: H52.1)"
  }
};

export async function getPatientById(id: string): Promise<PatientRecord | null> {
  // Simulate network latency or replace with a real fetch() call to your backend API
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  // Return matched ID from mock database or construct a fallback record dynamically
  if (mockPatients[id]) {
    return mockPatients[id];
  }

  // Fallback pattern for any unmapped ID clicked from the queue
  return {
    id: id,
    name: "Amina Bello",
    age: 34,
    gender: "F",
    mrn: `#${id}`,
    allergies: ["No Known Allergies"],
    history: [
      { date: "09/05/2026", title: "Triage & Vitals", details: "Patient presented with mild ocular strain." }
    ],
    imaging: [
      { id: `img-${id}-1`, type: "OCT Macula OD", date: "09/05/2026", color: "text-rose-500", path: "M0,45 Q25,10 50,25 T100,5" },
      { id: `img-${id}-2`, type: "OCT RNFL OS", date: "09/05/2026", color: "text-emerald-400", path: "M0,10 Q35,40 60,15 T100,30" }
    ],
    slitLamp: {
      od: "Clear anterior segment",
      os: "Clear anterior segment"
    },
    refraction: {
      od: { sphere: "-1.50", cylinder: "-0.25", axis: "090" },
      os: { sphere: "-1.25", cylinder: "0.00", axis: "000" }
    },
    previousRefraction: {
      date: "01/10/2025",
      od: { sphere: "-1.25", cylinder: "0.00", axis: "090" },
      os: { sphere: "-1.00", cylinder: "0.00", axis: "000" }
    },
    diagnosis: "Simple Myopia (ICD-10: H52.1)"
  };
}