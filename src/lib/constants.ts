export const USER_TYPES = {
  STUDENT: "student",
  ALUMNI: "alumni",
} as const;

export const COURSES = [
  "B.Tech (Bachelor of Technology)",
  "MBA (Master of Business Administration)",
  "M.Tech (Master of Technology)",
  "B.Sc (Bachelor of Science)",
  "M.A. (Master of Arts)",
  "B.Com (Bachelor of Commerce)",
  "MBBS (Bachelor of Medicine, Bachelor of Surgery)",
  "PhD (Doctor of Philosophy)",
];

export const UNIVERSITIES_SAMPLE = [
  "Stanford University",
  "Massachusetts Institute of Technology (MIT)",
  "Harvard University",
  "University of California, Berkeley (UCB)",
  "University of Oxford",
  "California Institute of Technology (Caltech)",
  "University of Cambridge",
  "ETH Zurich (Swiss Federal Institute of Technology Zurich)",
  "National University of Singapore (NUS)",
  "Princeton University",
  "Yale University",
  "Imperial College London",
  "University of Chicago",
  "Tsinghua University",
  "Peking University",
  // Add more to reach a decent sample size for UI, actual 250 would be too long for here
];

export const SKILLS_AND_FIELDS = [
  "Web Development (Frontend)",
  "Web Development (Backend)",
  "Full-Stack Development",
  "Data Science",
  "Machine Learning",
  "Artificial Intelligence",
  "Cybersecurity",
  "Product Management",
  "Mobile App Development (iOS)",
  "Mobile App Development (Android)",
  "Cloud Computing (AWS)",
  "Cloud Computing (Azure)",
  "Cloud Computing (GCP)",
  "DevOps Engineering",
  "Blockchain Development",
  "UI/UX Design",
  "Game Development",
  "Internet of Things (IoT)",
  "Augmented Reality (AR) / Virtual Reality (VR)",
  "Digital Marketing",
  "Business Analysis",
  "Project Management",
  "Quantitative Finance",
  "Healthcare IT",
  "Robotics & Automation",
  "Biotechnology",
  "Supply Chain Management",
  "Human Resources",
  "Consulting",
  "Research & Development",
];

export const MOCK_TESTIMONIALS = [
  {
    id: "1",
    name: "Sarah L.",
    role: "B.Tech Student, Tech University",
    feedback: "MentorConnect helped me find an amazing mentor in AI who guided me through my final year project. The platform is intuitive and the alumni network is fantastic!",
    avatarUrl: "https://picsum.photos/seed/sarah/100/100",
  },
  {
    id: "2",
    name: "John B.",
    role: "Alumni, Lead Developer @ Innovatech",
    feedback: "It's fulfilling to give back to my alma mater through MentorConnect. Connecting with bright students and sharing my experience has been rewarding.",
    avatarUrl: "https://picsum.photos/seed/johnb/100/100",
  },
  {
    id: "3",
    name: "Emily K.",
    role: "MBA Candidate, Business School",
    feedback: "The diverse range of mentors available across different industries is impressive. I received invaluable career advice that helped me secure my dream internship.",
    avatarUrl: "https://picsum.photos/seed/emilyk/100/100",
  },
];
