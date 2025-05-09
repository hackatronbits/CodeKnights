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
    workingField?: string; // Added to support filtering alumni by workingField directly if needed
    passOutUniversity?: string; // Added to support filtering alumni by passOutUniversity
    // Add more filters as needed
  };
  initialLoad?: boolean; // Whether to load initial data on mount
}

export function useUsers(options: UseUsersOptions = {}) {
  const { userType, pageSize = 9, filters: initialFilters = {}, initialLoad = true } = options;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentFilters, setCurrentFilters] = useState<UseUsersOptions['filters']>(initialFilters);

  const fetchUsers = useCallback(async (loadMore = false, filtersToUse?: UseUsersOptions['filters']) => {
    setLoading(true);
    setError(null);

    const effectiveFilters = filtersToUse || {};
    console.log("useUsers: Fetching users with params:", { userType, loadMore, effectiveFilters, pageSize });

    try {
      const usersCollectionRef = collection(db, 'users');
      const queryConstraints: QueryConstraint[] = [];

      queryConstraints.push(where('isProfileComplete', '==', true));

      if (userType) {
        queryConstraints.push(where('userType', '==', userType));
      }

      // Apply dynamic filters based on `effectiveFilters`
      // These filter keys should match the keys used when calling setFilters
      if (effectiveFilters.fieldOfInterest) {
        queryConstraints.push(where('fieldOfInterest', '==', effectiveFilters.fieldOfInterest));
      }
      if (effectiveFilters.workingField) {
        queryConstraints.push(where('workingField', '==', effectiveFilters.workingField));
      }
      if (effectiveFilters.university) {
        queryConstraints.push(where('university', '==', effectiveFilters.university));
      }
      if (effectiveFilters.passOutUniversity) {
        queryConstraints.push(where('passOutUniversity', '==', effectiveFilters.passOutUniversity));
      }
      
      // Add other specific filters as needed based on the keys in effectiveFilters

      queryConstraints.push(orderBy('createdAt', 'desc')); // Default sorting
      queryConstraints.push(limit(pageSize));

      if (loadMore && lastVisible) {
        queryConstraints.push(startAfter(lastVisible));
      }

      // Log the constructed query constraints
      console.log("useUsers: Constructed queryConstraints:", JSON.stringify(queryConstraints.map(qc => ({
        type: qc.type,
        // @ts-ignore
        fieldPath: qc._fieldPath?.canonicalString(),
        // @ts-ignore
        op: qc._op,
        // @ts-ignore
        value: qc._value
      }))));


      const q = query(usersCollectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);

      const fetchedUsers = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
      console.log(`useUsers: Fetched ${fetchedUsers.length} users.`);

      if (querySnapshot.empty || fetchedUsers.length < pageSize) {
        setHasMore(false);
        console.log("useUsers: No more users found or less than page size.");
      } else {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(true);
      }

      setUsers(prevUsers => {
        const uniqueFetchedUsers = fetchedUsers.filter(newUser => !prevUsers.some(existingUser => existingUser.uid === newUser.uid));
        return loadMore ? [...prevUsers, ...uniqueFetchedUsers] : fetchedUsers;
      });

    } catch (e: any) {
      console.error("useUsers: Error fetching users: ", e);
      if (e.code === 'failed-precondition' && e.message.includes('index')) {
          const detailedErrorMsg = "Database query failed: A required Firestore index is missing. Please check your `firestore.indexes.json` file, ensure it has been deployed (`firebase deploy --only firestore:indexes`), AND verify that the index has finished building in the Firebase Console (Indexes tab). The Firebase console error message also provides a direct link to create the specific missing index.";
          setError(detailedErrorMsg);
          console.error("INDEX REQUIRED:", e.message, "Ensure `firestore.indexes.json` is deployed AND the index build is complete in Firebase Console.");
      } else {
          setError(e.message || 'Failed to fetch users.');
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, pageSize, lastVisible]);


  useEffect(() => {
    const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(initialFilters);
    if (initialLoad || filtersChanged) {
      console.log("useUsers Effect: Initial load or filters changed. Fetching first page.", { initialLoad, currentFilters, filtersChanged });
      setUsers([]);
      setLastVisible(null);
      setHasMore(true);
      fetchUsers(false, currentFilters);
    } else {
        console.log("useUsers Effect: Skipped fetch (initialLoad is false and filters haven't significantly changed).");
        if (!loading && users.length === 0) { // If not loading and no users, ensure hasMore is potentially true for manual refresh/load.
             // Only set loading false if it was true and we are not fetching
             if(loading) setLoading(false);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoad, JSON.stringify(currentFilters), fetchUsers]); // Added fetchUsers to dependency array


  const loadMoreUsers = useCallback(() => {
    if (hasMore && !loading) {
      console.log("useUsers: Loading more users with current filters:", currentFilters);
      fetchUsers(true, currentFilters);
    }
  }, [hasMore, loading, fetchUsers, currentFilters]);


  const refreshUsers = useCallback(() => {
    console.log("useUsers: Refreshing users with current filters:", currentFilters);
    setUsers([]);
    setLastVisible(null);
    setHasMore(true);
    fetchUsers(false, currentFilters);
  }, [fetchUsers, currentFilters]);


   const setFilters = useCallback((newFilters: UseUsersOptions['filters']) => {
       console.log("useUsers: Setting new filters:", newFilters);
       setCurrentFilters(newFilters || {});
   }, []);

  return {
    users,
    loading,
    error,
    hasMore,
    loadMoreUsers,
    refreshUsers,
    setFilters
  };
}

