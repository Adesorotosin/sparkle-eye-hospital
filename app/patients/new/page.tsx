"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Phone,
  Camera,
  Lock,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

export default function RegisterPatientPage() {
  const [activeStep, setActiveStep] = useState(1);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState("Male");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");

  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [address, setAddress] = useState("");

  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinRelation, setNextOfKinRelation] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");

  const [referralSource, setReferralSource] = useState("Optician");

  // Auto-Calculate Age based on Date of Birth
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDob(value);
    if (value) {
      const birthYear = new Date(value).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && birthYear <= currentYear) {
        setAge((currentYear - birthYear).toString());
      }
    } else {
      setAge("");
    }
  };

  const steps = [
    { id: 1, name: "Personal Info" },
    { id: 2, name: "Contact" },
    { id: 3, name: "Metadata" },
    { id: 4, name: "Review" },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans antialiased text-slate-800">
      
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/logo.png"
                alt="Sparkle Eye Hospital Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                Sparkle Eye
              </h1>
              <p className="text-[9px] font-semibold text-purple-600 tracking-wider uppercase mt-0.5">
                SPECIALIST HOSPITAL
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
              Dashboard
            </Link>
            <Link href="/patients" className="px-3 py-1.5 rounded-lg bg-purple-50 text-[#6D4AFF] font-semibold">
              Patients
            </Link>
            <Link href="/appointments" className="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
              Appointments
            </Link>
            <Link href="/billing" className="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
              Billing
            </Link>
            <Link href="/reports" className="px-3 py-1.5 rounded-lg hover:text-slate-900 transition">
              Reports
            </Link>
          </nav>
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=150&auto=format&fit=crop"
            alt="Sarah Jenkins"
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
          <div className="hidden sm:block text-left">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
              <span>Sarah Jenkins</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Front Desk Ops</p>
          </div>
        </div>
      </header>

      {/* 2. PAGE TITLE & STEPPER HEADER */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Register New Patient
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Fill out the patient registration file. Required fields are marked with an asterisk (*).
            </p>
          </div>

          {/* Stepper Wizard */}
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.id === activeStep
                        ? "bg-[#6D4AFF] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      step.id === activeStep ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 3. FORM CARDS */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          
          {/* CARD 1: ID GENERATOR & PHOTO UPLOAD */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                TEMPORARY PATIENT RECORD ID
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xl font-extrabold text-[#6D4AFF] bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                  SESH-2026-0412
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  ID generated automatically upon save.
                </span>
              </div>
            </div>

            {/* Photo Uploader */}
            <div className="w-full sm:w-auto">
              <label className="w-full sm:w-44 h-24 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/40 hover:bg-purple-50/70 transition flex flex-col items-center justify-center cursor-pointer group">
                <Camera className="w-5 h-5 text-[#6D4AFF] mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-semibold text-[#6D4AFF]">
                  Upload Photo
                </span>
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
          </div>

          {/* CARD 2: PERSONAL INFORMATION */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-l-4 border-[#6D4AFF] pl-3">
              <h2 className="text-base font-bold text-slate-900">
                Personal Information
              </h2>
            </div>

            {/* Name Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Middle Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Robert"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
                />
              </div>
            </div>

            {/* Sex, DOB, Age Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Sex <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-5 pt-1">
                  {["Male", "Female", "Other"].map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="sex"
                        value={option}
                        checked={sex === option}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-4 h-4 text-[#6D4AFF] focus:ring-[#6D4AFF] accent-[#6D4AFF]"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={handleDobChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-700 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Age (Years)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    placeholder="24"
                    value={age}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none cursor-not-allowed"
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-[#6D4AFF] bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    AUTO
                  </span>
                </div>
              </div>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Occupation
              </label>
              <input
                type="text"
                placeholder="e.g. Software Engineer"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
              />
            </div>
          </div>

          {/* CARD 3: CONTACT & EMERGENCY DETAILS */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-l-4 border-[#6D4AFF] pl-3">
              <h2 className="text-base font-bold text-slate-900">
                Contact & Emergency Details
              </h2>
            </div>

            {/* Phone Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Secondary Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
                />
              </div>
            </div>

            {/* Residential Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Residential Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Street Address, City, State, ZIP Code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
              />
            </div>

            {/* Next of Kin Sub-Section */}
            <div className="pt-2">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">
                NEXT OF KIN / EMERGENCY CONTACT
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Next of Kin Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={nextOfKinName}
                    onChange={(e) => setNextOfKinName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={nextOfKinRelation}
                    onChange={(e) => setNextOfKinRelation(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-700 transition"
                  >
                    <option value="">Select Relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Next of Kin Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      value={nextOfKinPhone}
                      onChange={(e) => setNextOfKinPhone(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: METADATA & SOURCE */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-l-4 border-[#6D4AFF] pl-3">
              <h2 className="text-base font-bold text-slate-900">
                Metadata & Source
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registration Date
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value="2026-04-12"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none cursor-not-allowed"
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-[#6D4AFF] bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    AUTO
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Referral Source
                </label>
                <select
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] text-slate-700 transition"
                >
                  <option value="Optician">Optician</option>
                  <option value="General Practitioner">General Practitioner</option>
                  <option value="Self Referral">Self Referral</option>
                  <option value="Insurance Provider">Insurance Provider</option>
                </select>
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>All patient data is encrypted and stored securely (HIPAA compliant).</span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#6D4AFF] hover:bg-[#5B3CE1] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#6D4AFF]/20 transition"
            >
              Save & Open Patient File
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}