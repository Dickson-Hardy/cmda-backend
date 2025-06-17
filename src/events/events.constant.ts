export enum EventAudience {
  STUDENT = 'Student',
  DOCTOR = 'Doctor', // Keep for backward compatibility
  DOCTOR_0_5_YEARS = 'Doctor_0_5_Years',
  DOCTOR_ABOVE_5_YEARS = 'Doctor_Above_5_Years',
  GLOBALNETWORK = 'GlobalNetwork',
}

export const AllEventAudiences = [
  EventAudience.STUDENT,
  EventAudience.DOCTOR_0_5_YEARS,
  EventAudience.DOCTOR_ABOVE_5_YEARS,
  EventAudience.GLOBALNETWORK,
];

// Legacy support - includes old DOCTOR enum
export const AllEventAudiencesWithLegacy = [
  EventAudience.STUDENT,
  EventAudience.DOCTOR,
  EventAudience.DOCTOR_0_5_YEARS,
  EventAudience.DOCTOR_ABOVE_5_YEARS,
  EventAudience.GLOBALNETWORK,
];

// Helper enum for doctor experience levels
export enum DoctorExperience {
  JUNIOR_0_5 = '0 - 5 Years',
  SENIOR_5_PLUS = '5 Years and Above',
}

export enum EventTag {
  WEBINAR = 'Webinar',
  SEMINAR = 'Seminar',
  CONFERENCE = 'Conference',
  TRAINING = 'Training',
}

export enum EventType {
  PHYSICAL = 'Physical',
  VIRTUAL = 'Virtual',
  HYBRID = 'Hybrid',
}

// New conference-specific enums
export enum ConferenceType {
  NATIONAL = 'National',
  ZONAL = 'Zonal',
  REGIONAL = 'Regional',
}

export enum ConferenceZone {
  WESTERN = 'Western',
  EASTERN = 'Eastern',
  NORTHERN = 'Northern',
}

export enum ConferenceRegion {
  AMERICAS_CARIBBEAN = 'Americas & Caribbean',
  UK_EUROPE = 'UK/Europe',
  AUSTRALIA_ASIA = 'Australia/Asia',
  MIDDLE_EAST = 'Middle East',
  AFRICA = 'Africa',
}

export enum RegistrationPeriod {
  REGULAR = 'Regular',
  LATE = 'Late',
}

export const AllConferenceTypes = [
  ConferenceType.NATIONAL,
  ConferenceType.ZONAL,
  ConferenceType.REGIONAL,
];

export const AllConferenceZones = [
  ConferenceZone.WESTERN,
  ConferenceZone.EASTERN,
  ConferenceZone.NORTHERN,
];

export const AllConferenceRegions = [
  ConferenceRegion.AMERICAS_CARIBBEAN,
  ConferenceRegion.UK_EUROPE,
  ConferenceRegion.AUSTRALIA_ASIA,
  ConferenceRegion.MIDDLE_EAST,
  ConferenceRegion.AFRICA,
];

export const AllRegistrationPeriods = [RegistrationPeriod.REGULAR, RegistrationPeriod.LATE];

// Helper functions for doctor experience categorization
export const getDoctorExperienceCategory = (yearsOfExperience: string): EventAudience => {
  if (!yearsOfExperience) return EventAudience.DOCTOR_0_5_YEARS; // Default for missing data

  if (yearsOfExperience.includes('0 - 5') || yearsOfExperience.includes('0-5')) {
    return EventAudience.DOCTOR_0_5_YEARS;
  } else if (
    yearsOfExperience.includes('5 Years and Above') ||
    yearsOfExperience.includes('Above 5')
  ) {
    return EventAudience.DOCTOR_ABOVE_5_YEARS;
  }

  // Fallback for any other format
  return EventAudience.DOCTOR_0_5_YEARS;
};

export const getUserEventAudience = (
  userRole: string,
  yearsOfExperience?: string,
): EventAudience => {
  switch (userRole) {
    case 'Student':
      return EventAudience.STUDENT;
    case 'Doctor':
      return getDoctorExperienceCategory(yearsOfExperience);
    case 'GlobalNetwork':
      return EventAudience.GLOBALNETWORK;
    default:
      throw new Error(`Unknown user role: ${userRole}`);
  }
};

// Convert legacy doctor audiences to new format
export const expandDoctorAudiences = (audiences: EventAudience[]): EventAudience[] => {
  const expandedAudiences = [...audiences];

  // If legacy DOCTOR is included, replace with both experience levels
  const doctorIndex = expandedAudiences.indexOf(EventAudience.DOCTOR);
  if (doctorIndex !== -1) {
    expandedAudiences.splice(
      doctorIndex,
      1,
      EventAudience.DOCTOR_0_5_YEARS,
      EventAudience.DOCTOR_ABOVE_5_YEARS,
    );
  }

  return expandedAudiences;
};

// Get display label for experience categories
export const getAudienceDisplayLabel = (audience: EventAudience): string => {
  switch (audience) {
    case EventAudience.STUDENT:
      return 'Students';
    case EventAudience.DOCTOR:
      return 'Doctors (All)';
    case EventAudience.DOCTOR_0_5_YEARS:
      return 'Doctors (0-5 Years)';
    case EventAudience.DOCTOR_ABOVE_5_YEARS:
      return 'Doctors (Above 5 Years)';
    case EventAudience.GLOBALNETWORK:
      return 'Global Network';
    default:
      return audience;
  }
};
