// This file stores university reviews in a local data structure for development/demo purposes.
// In production, reviews should be stored in Firestore or another backend.

import type { UniversityReview } from '@/types';

export const UNIVERSITY_REVIEWS: UniversityReview[] = [
  // Example review structure:
  // {
  //   id: 'review1',
  //   universityId: 'harvard',
  //   alumniId: 'alumni1',
  //   alumniName: 'John Doe',
  //   rating: 5,
  //   review: 'Great university!',
  //   timestamp: 1715400000000
  // }
];
