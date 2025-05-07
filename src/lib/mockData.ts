import type { Student, Alumni, UserType } from '@/types';
import { UNIVERSITIES_SAMPLE, SKILLS_AND_FIELDS, COURSES } from '@/lib/constants';
import { db } from '@/lib/firebase'; // Assuming firebase is initialized
import { collection, writeBatch, doc } from 'firebase/firestore';

// Helper function to get a random item from an array
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper function to get multiple random items (unique)
const getRandomItems = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const generateRandomUID = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

export const generateMockAlumni = (count: number): Alumni[] => {
  const alumniList: Alumni[] = [];
  for (let i = 0; i < count; i++) {
    const uid = `mock_alumni_${generateRandomUID()}_${i}`;
    const firstName = getRandomItem(firstNames);
    const lastName = getRandomItem(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    
    const alumni: Alumni = {
      uid,
      email,
      fullName,
      userType: "alumni",
      profileImageUrl: `https://picsum.photos/seed/${uid}/200/200`,
      contactNo: `+1-555-${Math.floor(1000000 + Math.random() * 9000000).toString().substring(0,7)}`,
      address: `${100 + i} Alumni Ave, City ${i % 10}, State ${String.fromCharCode(65 + (i % 26))}`,
      passOutUniversity: getRandomItem(UNIVERSITIES_SAMPLE),
      bio: `Experienced ${getRandomItem(SKILLS_AND_FIELDS)} professional with a passion for mentoring. Graduated from ${getRandomItem(UNIVERSITIES_SAMPLE)} and currently working at Tech Corp ${i}. Specialized in developing innovative solutions and leading teams.`,
      workingField: getRandomItem(SKILLS_AND_FIELDS),
      myMentees: [],
      isProfileComplete: true,
      createdAt: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365 * 5), // Randomly in last 5 years
    };
    alumniList.push(alumni);
  }
  return alumniList;
};

export const generateMockStudent = (count: number): Student[] => {
  const studentList: Student[] = [];
  for (let i = 0; i < count; i++) {
    const uid = `mock_student_${generateRandomUID()}_${i}`;
    const firstName = getRandomItem(firstNames);
    const lastName = getRandomItem(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}_student${i}@example.com`;

    const student: Student = {
      uid,
      email,
      fullName,
      userType: "student",
      profileImageUrl: `https://picsum.photos/seed/${uid}/200/200`,
      contactNo: `+1-555-${Math.floor(1000000 + Math.random() * 9000000).toString().substring(0,7)}`,
      address: `${200 + i} Student St, Town ${i % 10}, State ${String.fromCharCode(65 + (i % 26))}`,
      pursuingCourse: getRandomItem(COURSES),
      university: getRandomItem(UNIVERSITIES_SAMPLE),
      fieldOfInterest: getRandomItem(SKILLS_AND_FIELDS),
      myMentors: [],
      isProfileComplete: true,
      createdAt: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365 * 2), // Randomly in last 2 years
    };
    studentList.push(student);
  }
  return studentList;
};


// Function to seed data to Firestore (run this manually or via a script if needed)
// IMPORTANT: THIS IS A WRITE OPERATION. USE WITH CAUTION.
export async function seedFirestoreWithMockData() {
  console.log("Starting Firestore data seeding...");

  const alumniToSeed = generateMockAlumni(250); // As per requirement
  const studentsToSeed = generateMockStudent(200); // As per requirement

  const batch = writeBatch(db);
  const usersCollection = collection(db, "users");

  alumniToSeed.forEach(alumni => {
    const docRef = doc(usersCollection, alumni.uid);
    batch.set(docRef, alumni);
  });
  console.log(`Prepared ${alumniToSeed.length} alumni for batch write.`);

  studentsToSeed.forEach(student => {
    const docRef = doc(usersCollection, student.uid);
    batch.set(docRef, student);
  });
  console.log(`Prepared ${studentsToSeed.length} students for batch write.`);

  try {
    await batch.commit();
    console.log("Firestore seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding Firestore: ", error);
  }
}

// To use:
// You might call seedFirestoreWithMockData() from a temporary page or a Node.js script.
// Example (in a temporary component or script):
// import { useEffect } from 'react';
// import { seedFirestoreWithMockData } from '@/lib/mockData';
//
// function SeederComponent() {
//   useEffect(() => {
//     const seed = async () => {
//       // Check if data already exists or add a flag to prevent re-seeding
//       // For now, this will run every time the component mounts if not careful
//       // await seedFirestoreWithMockData();
//     };
//     // seed(); // Uncomment to run
//   }, []);
//   return <div>Seeding data (check console)...</div>;
// }

// Note: For a real application, UID generation would come from Firebase Auth.
// These mock UIDs are for populating the database for demonstration.
// When a real user signs up, their Firebase Auth UID will be used.
