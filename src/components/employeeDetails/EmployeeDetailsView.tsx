import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { EmployeeDirectory } from './EmployeeDirectory';
import { EmployeeSelfProfile } from './EmployeeSelfProfile';

interface EmployeeDetailsViewProps {
  role?: 'admin' | 'manager' | 'employee';
}

export const EmployeeDetailsView: React.FC<EmployeeDetailsViewProps> = ({ role }) => {
  const { currentUser } = useAuth();
  const effectiveRole = role || currentUser?.role || 'employee';

  if (effectiveRole === 'employee') {
    return <EmployeeSelfProfile />;
  }

  return <EmployeeDirectory roleMode={effectiveRole === 'manager' ? 'manager' : 'admin'} />;
};
