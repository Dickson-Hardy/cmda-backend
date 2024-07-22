export enum UserRole {
  STUDENT = 'Student',
  DOCTOR = 'Doctor',
  GLOBALNETWORK = 'GlobalNetwork',
}

export enum UserGender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export const AllUserRoles = [UserRole.STUDENT, UserRole.DOCTOR, UserRole.GLOBALNETWORK];

export enum TransitionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
