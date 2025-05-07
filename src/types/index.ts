export type UserType = "student" | "alumni";

export interface BaseUser {
  uid: string;
  email: string;
  fullName: string;
  userType: UserType;
  profileImageUrl?: string;
  contactNo?: string;
  address?: string;
  isProfileComplete: boolean;
  createdAt: number; // Timestamp
}

export interface StudentProfile {
  pursuingCourse?: string;
  university?: string;
  fieldOfInterest?: string;
  myMentors?: string[]; // Array of Alumni UIDs
}

export interface AlumniProfile {
  passOutUniversity?: string;
  bio?: string;
  workingField?: string;
  myMentees?: string[]; // Array of Student UIDs
}

export type Student = BaseUser & { userType: "student" } & StudentProfile;
export type Alumni = BaseUser & { userType: "alumni" } & AlumniProfile;
export type User = Student | Alumni;

export interface Testimonial {
  id: string;
  name: string;
  role: string; // e.g., "Student at XYZ University", "Software Engineer @ ABC Corp"
  feedback: string;
  avatarUrl?: string;
}
