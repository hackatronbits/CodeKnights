"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentData, QueryConstraint, Query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Student, Alumni, UserType } from '@/types';

interface UseUsersOptions {
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
  const { userType, pageSize = 9, filters = {}, initialLoad = true } = options;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchUsers = useCallback(async (loadMore = false) => {
    setLoading(true);
    setError(null);

    try {
      const usersCollectionRef = collection(db, 'users');
      const queryConstraints: QueryConstraint[] = [];

      if (userType) {
        queryConstraints.push(where('userType', '==', userType));
      }
      
      // Ensure profile is complete to only show relevant users
      queryConstraints.push(where('isProfileComplete', '==', true));

      if (filters.fieldOfInterest) {
        const fieldToQuery = userType === 'student' ? 'fieldOfInterest' : 'workingField';
        queryConstraints.push(where(fieldToQuery, '==', filters.fieldOfInterest));
      }
      if (filters.university) {
         const fieldToQuery = userType === 'student' ? 'university' : 'passOutUniversity';
        queryConstraints.push(where(fieldToQuery, '==', filters.university));
      }
      
      queryConstraints.push(orderBy('createdAt', 'desc')); // Or 'fullName' for alphabetical
      queryConstraints.push(limit(pageSize));

      if (loadMore && lastVisible) {
        queryConstraints.push(startAfter(lastVisible));
      }

      const q = query(usersCollectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      const fetchedUsers = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));

      if (querySnapshot.empty || fetchedUsers.length < pageSize) {
        setHasMore(false);
      } else {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(true);
      }
      
      setUsers(prevUsers => loadMore ? [...prevUsers, ...fetchedUsers] : fetchedUsers);

    } catch (e: any) {
      console.error("Error fetching users: ", e);
      setError(e.message || 'Failed to fetch users.');
      setHasMore(false); // Stop trying to load more if an error occurs
    } finally {
      setLoading(false);
    }
  }, [userType, pageSize, filters, lastVisible]);


  const loadMoreUsers = useCallback(() => {
    if (hasMore && !loading) {
      fetchUsers(true);
    }
  }, [hasMore, loading, fetchUsers]);

  // Initial fetch
  useEffect(() => {
    if (initialLoad) {
      setUsers([]); // Reset users before initial fetch if options change
      setLastVisible(null);
      setHasMore(true);
      fetchUsers(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, pageSize, JSON.stringify(filters), initialLoad]); // Deep compare filters


  // Function to explicitly refresh or re-fetch with new filters
  const refreshUsers = useCallback(() => {
    setUsers([]);
    setLastVisible(null);
    setHasMore(true);
    fetchUsers(false);
  }, [fetchUsers]);

  return { users, loading, error, hasMore, loadMoreUsers, refreshUsers, setFilters: (newFilters: UseUsersOptions['filters']) => {
      // This is a simplified setter, for more complex state management, consider useReducer
      options.filters = newFilters; // Mutating options directly, better to manage filters statefully if complex
      refreshUsers();
    } 
  };
}
