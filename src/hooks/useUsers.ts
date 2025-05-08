"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentData, QueryConstraint, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Student, Alumni, UserType } from '@/types';

export interface UseUsersOptions {
  userType?: UserType; // 'student' or 'alumni'
  pageSize?: number;
  filters?: {
    fieldOfInterest?: string;
    university?: string;
    // Add more filters as needed
  };
  initialLoad?: boolean; // Whether to load initial data on mount
}

export function useUsers(options: UseUsersOptions = {}) {
  const { userType, pageSize = 9, filters: initialFilters = {}, initialLoad = true } = options;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(initialLoad); // Set initial loading based on initialLoad
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  // Fix: Correct useState destructuring syntax
  const [currentFilters, setCurrentFilters] = useState(initialFilters); // Internal state for filters

  const fetchUsers = useCallback(async (loadMore = false, filtersToUse: UseUsersOptions['filters']) => {
    // Only set loading true if not already loading to prevent state loops
    setLoading(prev => {
      if (!prev) return true;
      return prev;
    });
    setError(null);

    // Use a temporary variable for filters inside the fetch logic
    const effectiveFilters = filtersToUse || {};

    console.log("Fetching users with filters:", { userType, loadMore, effectiveFilters });

    try {
      const usersCollectionRef = collection(db, 'users');
      const queryConstraints: QueryConstraint[] = [];

      // Filter by userType if provided
      if (userType) {
        queryConstraints.push(where('userType', '==', userType));
      }

      // Ensure profile is complete to only show relevant users
      queryConstraints.push(where('isProfileComplete', '==', true));

      // Apply dynamic filters based on `effectiveFilters`
      if (effectiveFilters.fieldOfInterest) {
        const fieldToQuery = userType === 'student' ? 'fieldOfInterest' : 'workingField';
        console.log(`Applying filter: ${fieldToQuery} == ${effectiveFilters.fieldOfInterest}`);
        queryConstraints.push(where(fieldToQuery, '==', effectiveFilters.fieldOfInterest));
      }
      if (effectiveFilters.university) {
         const fieldToQuery = userType === 'student' ? 'university' : 'passOutUniversity';
         console.log(`Applying filter: ${fieldToQuery} == ${effectiveFilters.university}`);
        queryConstraints.push(where(fieldToQuery, '==', effectiveFilters.university));
      }

      // Order and limit
      queryConstraints.push(orderBy('createdAt', 'desc')); // Use default sorting
      queryConstraints.push(limit(pageSize));

      // Pagination
      if (loadMore && lastVisible) {
        queryConstraints.push(startAfter(lastVisible));
      }

      const q = query(usersCollectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);

      const fetchedUsers = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      console.log(`Fetched ${fetchedUsers.length} users.`);

      if (querySnapshot.empty || fetchedUsers.length < pageSize) {
        setHasMore(false);
         console.log("No more users found or less than page size.");
      } else {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(true);
      }

      // Update users state based on whether it's a loadMore operation
       setUsers(prevUsers => {
           // Filter out duplicates just in case (can happen with fast clicks/re-renders)
           const uniqueFetchedUsers = fetchedUsers.filter(newUser => !prevUsers.some(existingUser => existingUser.uid === newUser.uid));
           return loadMore ? [...prevUsers, ...uniqueFetchedUsers] : fetchedUsers;
       });


    } catch (e: any) {
      console.error("Error fetching users: ", e);
       // Check for specific Firestore index error
      if (e.code === 'failed-precondition' && e.message.includes('index')) {
          setError("Database query failed: A required index is missing. Please check Firestore indexes.");
          console.error("INDEX REQUIRED:", e.message); // Log the specific index needed if possible
      } else {
          setError(e.message || 'Failed to fetch users.');
      }
      setHasMore(false); // Stop trying to load more if an error occurs
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, pageSize, lastVisible]); // Removed filters from here, pass explicitly


  // Effect for initial load and when filters change via setFilters
  useEffect(() => {
    // Only fetch if initialLoad is true OR if filters have changed from initial state (or explicitly set)
    // The check `JSON.stringify(currentFilters) !== JSON.stringify(initialFilters)` prevents initialLoad=false fetch
    if (initialLoad || JSON.stringify(currentFilters) !== JSON.stringify(initialFilters)) {
      console.log("Effect triggered: initialLoad or filters changed. Fetching first page.", { initialLoad, currentFilters });
      setUsers([]); // Reset users
      setLastVisible(null);
      setHasMore(true);
      fetchUsers(false, currentFilters); // Fetch with the current filters
    } else {
        console.log("Effect skipped: initialLoad is false and filters haven't changed.");
        setLoading(false); // Ensure loading is false if initialLoad is false and no filters set
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoad, JSON.stringify(currentFilters)]); // Depend on stringified filters

  // Function to load the next page of users using the current filters
  const loadMoreUsers = useCallback(() => {
    if (hasMore && !loading) {
      console.log("Loading more users with current filters:", currentFilters);
      fetchUsers(true, currentFilters);
    }
  }, [hasMore, loading, fetchUsers, currentFilters]);

  // Function to manually refresh the user list (e.g., pull-to-refresh) using current filters
  const refreshUsers = useCallback(() => {
    console.log("Refreshing users with current filters:", currentFilters);
    setUsers([]);
    setLastVisible(null);
    setHasMore(true);
    fetchUsers(false, currentFilters); // Fetch page 1 with current filters
  }, [fetchUsers, currentFilters]);

   // Function to update the filters and trigger a refetch
   const setFilters = useCallback((newFilters: UseUsersOptions['filters']) => {
       console.log("Setting new filters:", newFilters);
       setCurrentFilters(newFilters || {});
       // The useEffect hook depending on `JSON.stringify(currentFilters)` will trigger the refetch
   }, []);

  return {
    users,
    loading,
    error,
    hasMore,
    loadMoreUsers,
    refreshUsers,
    setFilters // Expose the function to set filters
  };
}
