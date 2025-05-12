import { useCallback } from 'react';
import { UseUsersOptions } from '@/hooks/useUsers';

export function useFindMentorsFilter(currentUser: any, filterType: string, selectedField: string, selectedUniversity: string) {
  // Returns the correct filter object for useUsers
  return useCallback(() => {
    const newFilters: UseUsersOptions['filters'] = {};
    const fieldKey = currentUser?.userType === 'student' ? 'workingField' : 'fieldOfInterest';
    const uniKey = currentUser?.userType === 'student' ? 'passOutUniversity' : 'university';
    if (filterType === 'fieldOfInterest' || filterType === 'both') {
      if (selectedField) newFilters[fieldKey] = selectedField;
    }
    if (filterType === 'university' || filterType === 'both') {
      if (selectedUniversity) newFilters[uniKey] = selectedUniversity;
    }
    return newFilters;
  }, [currentUser?.userType, filterType, selectedField, selectedUniversity]);
}
