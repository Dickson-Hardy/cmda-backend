export enum EventAudience {
  STUDENT = 'Student',
  DOCTOR = 'Doctor',
  GLOBALNETWORK = 'GlobalNetwork',
}

export const AllEventAudiences = [
  EventAudience.STUDENT,
  EventAudience.DOCTOR,
  EventAudience.GLOBALNETWORK,
];

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
