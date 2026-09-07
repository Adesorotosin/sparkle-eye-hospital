"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Search, 
  Filter,
  Stethoscope,
  Activity
} from "lucide-react";

interface PatientQueueItem {
  id: string;
  name: string;
  patientId: string;
  age: number;
  gender: string;
  stage: "triage" | "examination" | "diagnostics" | "pharmacy" | "billing";
  priority: "normal" | "urgent" | "emergency";
  timeInQueue: string;
  attendingDoctor: string;
}

const initialQueue: PatientQueueItem[] = [
  {
    id: "1",
    name: "Margaret Chen",
    patientId: "MRN-204587",
    age: 68,
    gender: "F",
    stage: "examination",
    priority: "urgent",
    timeInQueue: "15 mins",
    attendingDoctor: "Dr. Adebayo",
  },
  {
    id: "2",
    name: "Oluwaseun Adeleke",
    patientId: "MRN-204592",
    age: 42,
    gender: "M",
    stage: "triage",
    priority: "normal",
    timeInQueue: "5 mins",
    attendingDoctor: "Nurse Grace",
  },
  {
    id: "3",
    name: "Chidera Okafor",
    patientId: "MRN-204601",
    age: 30,
    gender: "F",
    stage: "diagnostics",
    priority: "emergency",
    timeInQueue: "30 mins",
    attendingDoctor: "Dr. Smith",
  },
  {
    id: "4",
    name: "Ibrahim Musa",
    patientId: "MRN-204550",
    age: 55,
    gender: "M",
    stage: "billing",
    priority: "normal",
    timeInQueue: "45 mins",
    attendingDoctor: "Cashier Desk",
  },
];

export default function WorkflowQueuePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientQueueItem[]>(initialQueue);
  const [searchTerm, setSearchTerm] = useState("");

  const stages: { key: PatientQueueItem["stage"]; label: string; color: string }[] = [
    { key: "triage", label: "Triage", color: "border-blue-400 text-blue-700 bg-blue-50" },
    { key: "examination", label: "Examination", color: "border-teal-400 text-teal-700 bg-teal-50" },
    { key: "diagnostics", label: "Diagnostics", color: "border-purple-400 text-purple-700 bg-purple-50" },
    { key: "pharmacy", label: "Pharmacy", color: "border-amber-400 text-amber-700 bg-amber-50" },
    { key: "billing", label: "Billing & Cashier", color: "border-emerald-400 text-emerald-700 bg-emerald-50" },
  ];

  const moveStage = (id: string, currentStage: PatientQueueItem["stage"]) => {
    const stageFlow: PatientQueueItem["stage"][] = ["triage", "examination", "diagnostics", "pharmacy", "billing"];
    const currentIndex = stageFlow.indexOf(currentStage);
    if (currentIndex < stageFlow.length - 1) {
      const nextStage = stageFlow[currentIndex + 1];
      setPatients(
        patients.map((p) => (p.id === id ? { ...p, stage: nextStage } : p))
      );
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#E5E9EE] text-slate-800 font-sans antialiased p-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#0B7285] font-bold text-xs uppercase tracking-wider">
            <Activity className="w-4 h-4" /> Clinical Operations Pipeline
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">Patient Workflow Queue</h1>
          <p className="text-xs text-slate-500 font-medium">
            Monitor and track patient movement across hospital stages in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0B7285] w-64"
            />
          </div>
        </div>
      </div>

      {/* KANBAN BOARD COLUMNS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const columnPatients = filteredPatients.filter((p) => p.stage === stage.key);

          return (
            <div key={stage.key} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 min-w-[260px]">
              {/* Column Header */}
              <div className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-between ${stage.color}`}>
                <span>{stage.label}</span>
                <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shadow-xs">
                  {columnPatients.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex flex-col gap-3 min-h-[400px]">
                {columnPatients.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium p-6 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    No patients in this stage
                  </div>
                ) : (
                  columnPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{patient.name}</h3>
                          <p className="text-[10px] text-slate-400 font-medium">{patient.patientId} • {patient.age}Y/{patient.gender}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                            patient.priority === "emergency"
                              ? "bg-rose-100 text-rose-800"
                              : patient.priority === "urgent"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {patient.priority}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 border-t border-slate-100 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Attending:</span>
                          <span className="font-semibold text-slate-700">{patient.attendingDoctor}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Wait Time:</span>
                          <span className="font-semibold text-amber-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {patient.timeInQueue}
                          </span>
                        </div>
                      </div>

                      {stage.key !== "billing" && (
                        <button
                          onClick={() => moveStage(patient.id, patient.stage)}
                          className="w-full py-1.5 px-3 bg-slate-50 hover:bg-[#E6F4F1] hover:text-[#0B7285] text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-200"
                        >
                          Move Next <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}