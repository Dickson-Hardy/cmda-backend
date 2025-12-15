export enum UserRole {
  STUDENT = 'Student',
  DOCTOR = 'Doctor',
  GLOBALNETWORK = 'GlobalNetwork',
  MEMBERMANAGER = 'MemberManager',
  ADMIN = 'Admin',
}

export enum UserGender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export const AllUserRoles = [
  UserRole.STUDENT,
  UserRole.DOCTOR,
  UserRole.GLOBALNETWORK,
  UserRole.MEMBERMANAGER,
  UserRole.ADMIN,
];

// Import EventAudience for categorization
import { EventAudience } from '../events/events.constant';

// Helper functions for user categorization
export const isDoctorRole = (role: string): boolean => {
  return role === UserRole.DOCTOR;
};

export const isStudentRole = (role: string): boolean => {
  return role === UserRole.STUDENT;
};

export const isGlobalNetworkRole = (role: string): boolean => {
  return role === UserRole.GLOBALNETWORK;
};

// Check if user has experience data (for doctors/global network)
export const hasExperienceData = (role: string, yearsOfExperience?: string): boolean => {
  if (role === UserRole.STUDENT) return true; // Students don't need experience
  return Boolean(yearsOfExperience && yearsOfExperience.trim());
};

// Determine if doctor is junior (0-5 years) or senior (above 5 years)
export const isDoctorJunior = (yearsOfExperience?: string): boolean => {
  if (!yearsOfExperience) return true; // Default to junior for missing data
  return yearsOfExperience.includes('0 - 5') || yearsOfExperience.includes('0-5');
};

export const isDoctorSenior = (yearsOfExperience?: string): boolean => {
  if (!yearsOfExperience) return false;
  return yearsOfExperience.includes('5 Years and Above') || yearsOfExperience.includes('Above 5');
};

/**
 * Get user's experience category for event visibility
 * @param role - User role
 * @param yearsOfExperience - Years of experience string
 * @returns EventAudience enum value
 */
export const getUserExperienceCategory = (
  role: UserRole,
  yearsOfExperience?: string,
): EventAudience => {
  switch (role) {
    case UserRole.STUDENT:
      return EventAudience.STUDENT;
    case UserRole.GLOBALNETWORK:
      return EventAudience.GLOBALNETWORK;
    case UserRole.DOCTOR:
      // Determine doctor category based on experience
      if (isDoctorJunior(yearsOfExperience)) {
        return EventAudience.DOCTOR_0_5_YEARS;
      } else if (isDoctorSenior(yearsOfExperience)) {
        return EventAudience.DOCTOR_ABOVE_5_YEARS;
      } else {
        // Default to junior for unclear/missing experience data
        return EventAudience.DOCTOR_0_5_YEARS;
      }
    default:
      return EventAudience.STUDENT; // Fallback
  }
};

export enum TransitionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
