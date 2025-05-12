import React, { useState } from "react";
import { generateMockAlumni } from "../src/lib/mockData";
import type { Alumni } from "../src/types";
import UserCard from "@/components/UserCard"; // Import UserCard component

// Real alumni data (sample 20 for demo)
const realAlumni: Alumni[] = generateMockAlumni(20);

// Additional dummy alumni profiles
const dummyAlumni: Alumni[] = [
  {
    uid: "dummy1",
    email: "dummy1@example.com",
    fullName: "Dummy One",
    userType: "alumni",
    profileImageUrl: "https://randomuser.me/api/portraits/men/1.jpg",
    contactNo: "+1-555-0000001",
    address: "123 Dummy St, Faketown, FS",
    passOutUniversity: "Dummy University",
    bio: "Mentor in Dummy Science, passionate about helping students.",
    workingField: "Dummy Science",
    myMentees: [],
    isProfileComplete: true,
    createdAt: Date.now() - 10000000,
  },
  {
    uid: "dummy2",
    email: "dummy2@example.com",
    fullName: "Dummy Two",
    userType: "alumni",
    profileImageUrl: "https://randomuser.me/api/portraits/women/2.jpg",
    contactNo: "+1-555-0000002",
    address: "456 Dummy Ave, Faketown, FS",
    passOutUniversity: "Fake Institute",
    bio: "Expert in Fake Engineering, loves teaching.",
    workingField: "Fake Engineering",
    myMentees: [],
    isProfileComplete: true,
    createdAt: Date.now() - 20000000,
  },
  {
    uid: "dummy3",
    email: "dummy3@example.com",
    fullName: "Dummy Three",
    userType: "alumni",
    profileImageUrl: "https://randomuser.me/api/portraits/men/3.jpg",
    contactNo: "+1-555-0000003",
    address: "789 Dummy Blvd, Faketown, FS",
    passOutUniversity: "Imaginary College",
    bio: "Imaginary mentor, always available for advice.",
    workingField: "Imaginary Studies",
    myMentees: [],
    isProfileComplete: true,
    createdAt: Date.now() - 30000000,
  },
];

// Combine real and dummy alumni
const ALUMNI: Alumni[] = [...realAlumni, ...dummyAlumni];

const UNIVERSITIES = Array.from(new Set(ALUMNI.map(a => a.passOutUniversity)));
const FIELDS = Array.from(new Set(ALUMNI.map(a => a.workingField)));

type FilterType = "university" | "field" | "both";

export default function FindMentorsFilter() {
  const [filterType, setFilterType] = useState<FilterType>("university");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [filtered, setFiltered] = useState(ALUMNI);
  const [applied, setApplied] = useState(false);

  const handleAddMentor = (userId: string) => {
    console.log(`Connection request sent to user with ID: ${userId}`);
    // Add logic to send connection request
  };

  // Filtering logic
  const applyFilters = () => {
    let result = ALUMNI;
    if (filterType === "university" && selectedUniversity) {
      result = result.filter(a => a.passOutUniversity === selectedUniversity);
    } else if (filterType === "field" && selectedField) {
      result = result.filter(a => a.workingField === selectedField);
    } else if (filterType === "both" && selectedUniversity && selectedField) {
      result = result.filter(
        a => a.passOutUniversity === selectedUniversity && a.workingField === selectedField
      );
    }
    setFiltered(result);
    setApplied(true);
  };

  React.useEffect(() => {
    setSelectedUniversity("");
    setSelectedField("");
    setFiltered(ALUMNI);
    setApplied(false);
  }, [filterType]);

  return (
    <section className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Find Mentors</h2>
      <form
        className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col gap-4"
        onSubmit={e => {
          e.preventDefault();
          applyFilters();
        }}
        aria-label="Mentor filter form"
      >
        <fieldset>
          <legend className="font-semibold mb-2">Filter by:</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="filterType"
                value="university"
                checked={filterType === "university"}
                onChange={() => setFilterType("university")}
              />
              University
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="filterType"
                value="field"
                checked={filterType === "field"}
                onChange={() => setFilterType("field")}
              />
              Field of Interest
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="filterType"
                value="both"
                checked={filterType === "both"}
                onChange={() => setFilterType("both")}
              />
              Both
            </label>
          </div>
        </fieldset>
        {(filterType === "university" || filterType === "both") && (
          <label className="block">
            <span className="block mb-1">University</span>
            <select
              className="w-full border rounded p-2"
              value={selectedUniversity}
              onChange={e => setSelectedUniversity(e.target.value)}
              aria-label="Select university"
            >
              <option value="">All</option>
              {UNIVERSITIES.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        )}
        {(filterType === "field" || filterType === "both") && (
          <label className="block">
            <span className="block mb-1">Field of Interest</span>
            <select
              className="w-full border rounded p-2"
              value={selectedField}
              onChange={e => setSelectedField(e.target.value)}
              aria-label="Select field of interest"
            >
              <option value="">All</option>
              {FIELDS.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Apply
        </button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? (
          filtered.map(alumnus => (
            <UserCard
              key={alumnus.uid}
              user={alumnus}
              onAddOrConnect={handleAddMentor}
              isAddedOrConnected={false} // Update based on connection status
              viewerType="student" // Assuming viewer is a student
            />
          ))
        ) : (
          applied && (
            <div className="col-span-full text-center text-gray-500">
              No mentors found.
            </div>
          )
        )}
      </div>
    </section>
  );
}
