export const SUBSCRIPTION_PRICES = {
  Student: 1000,
  Doctor: 5000,
  DoctorSenior: 10000,
  GlobalNetwork: 100,
};

// Income-based pricing for Global Network members (USD)
export const GLOBAL_INCOME_BASED_PRICING = {
  greater_than_200k: {
    label: 'Greater than $200,000',
    monthly: 40,
    annual: 400,
  },
  '100k_to_200k': {
    label: '$100,000-$200,000',
    monthly: 30,
    annual: 300,
  },
  '50k_to_100k': {
    label: '$50,000-$100,000',
    monthly: 20,
    annual: 200,
  },
  less_than_50k: {
    label: 'Less than $50,000',
    monthly: 10,
    annual: 100,
  },
  students_unemployed: {
    label: 'Students/Unemployed',
    monthly: 1,
    annual: 10,
  },
};

// Lifetime membership options (USD)
export const LIFETIME_MEMBERSHIPS = {
  gold: {
    label: 'Lifetime Gold (15 years)',
    price: 6000,
    years: 15,
  },
  platinum: {
    label: 'Lifetime Platinum (20 years)',
    price: 8000,
    years: 20,
  },
  diamond: {
    label: 'Lifetime Diamond (25 years)',
    price: 10000,
    years: 25,
  },
};

// Income brackets for selection
export const INCOME_BRACKETS = [
  { value: 'greater_than_200k', label: 'Greater than $200,000' },
  { value: '100k_to_200k', label: '$100,000 - $200,000' },
  { value: '50k_to_100k', label: '$50,000 - $100,000' },
  { value: 'less_than_50k', label: 'Less than $50,000' },
  { value: 'students_unemployed', label: 'Students/Unemployed' },
];
