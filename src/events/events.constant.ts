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
}
