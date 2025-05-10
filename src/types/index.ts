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
  createdAt: number; // Timestamp represented as number (milliseconds since epoch)
  updatedAt?: number; // Timestamp represented as number
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

// --- Chat Feature Types ---

export interface ParticipantInfo {
  fullName: string;
  profileImageUrl?: string;
}

export interface Conversation {
  id: string; // Firestore document ID (e.g., uid1_uid2)
  participants: string[]; // Array of two user UIDs
  participantInfo: {
    [uid: string]: ParticipantInfo;
  };
  lastMessage?: {
    text: string;
    senderUid: string;
    timestamp: number; // Firestore Timestamp converted to number
  };
  lastUpdatedAt: number; // Firestore Timestamp converted to number
}

export interface Message {
  id: string; // Firestore document ID
  conversationId: string;
  senderUid: string;
  receiverUid: string;
  text: string;
  timestamp: number; // Firestore Timestamp converted to number
}

export interface University {
  id: string;
  name: string;
  link: string;
  logoSeed?: string;
  avgRating: number;
  reviewCount: number;
  admission: {
    requirements: string;
    deadline: string;
    documents: string[];
  };
  visa: {
    type: string;
    steps: string[];
    fee?: string;
  };
  scholarships: Array<{
    name: string;
    description: string;
    eligibility: string;
    link: string;
  }>;
}

export interface UniversityReview {
  id: string;
  universityId: string;
  alumniId: string;
  alumniName: string;
  rating: number;
  review: string;
  timestamp: number;
}
