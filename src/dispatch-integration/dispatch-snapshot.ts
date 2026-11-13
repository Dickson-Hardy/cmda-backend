export function snapshot(member:any,settings:any){
 const iso=(value:unknown)=>{const date=value?new Date(value as string):null;return date&&!Number.isNaN(date.getTime())?date.toISOString():null;};
 const preferences=member.notificationPreferences??{};
 // The member document is authoritative when present; settings is a legacy fallback.
 const marketing=typeof preferences.marketing==='boolean'?preferences.marketing:settings?.marketing!==false;
 const emails=typeof preferences.emailNotifications==='boolean'?preferences.emailNotifications:settings?.emailNotifications!==false;
 const lifetime=member.hasLifetimeMembership===true&&(!member.lifetimeMembershipExpiry||new Date(member.lifetimeMembershipExpiry).getTime()>Date.now());
 const paid=lifetime||(member.subscribed===true&&!!member.subscriptionExpiry&&new Date(member.subscriptionExpiry).getTime()>Date.now());
 return {memberId:String(member._id),sourceUpdatedAt:iso(member.updatedAt??member.createdAt)??new Date().toISOString(),email:String(member.email??'').trim().toLowerCase(),firstName:String(member.firstName??''),fullName:String(member.fullName??[member.firstName,member.middleName,member.lastName].filter(Boolean).join(' ')),membershipId:String(member.membershipId??''),role:String(member.role??''),region:String(member.region??''),memberCategory:String(member.memberCategory??''),isGlobal:member.isGlobal===true||member.role==='GlobalNetwork',paidMembership:paid,subscriptionExpiry:iso(member.subscriptionExpiry),lifetimeMembership:lifetime,emailVerified:member.emailVerified===true,active:member.isActive!==false,banned:member.isBanned===true,deleted:false,marketingConsent:marketing===true,emailNotifications:emails,consentChangedAt:iso(member.dispatchConsentChangedAt),consentFeedbackSequence:Number(member.dispatchConsentFeedbackSequence??0)};
}
