import { PaystackFeeCalculator } from './src/_global/utils/paystack-fees.util';

console.log('=== Paystack Fee Calculator Test ===');

const testAmounts = [4000, 5000, 10000, 15000];

testAmounts.forEach((amount) => {
  const breakdown = PaystackFeeCalculator.getDetailedBreakdown(amount);

  console.log(`\n--- Test for ₦${amount} ---`);
  console.log(`Base Amount: ₦${breakdown.baseAmount}`);
  console.log(`Amount to Charge User: ₦${breakdown.chargeAmount}`);
  console.log(
    `Paystack Fees: ₦${breakdown.fees.totalFees} (₦${breakdown.fees.percentageFee} + ₦${breakdown.fees.fixedFee})`,
  );
  console.log(`Net Amount Received: ₦${breakdown.verification.netAmount}`);
  console.log(`Calculation Correct: ${breakdown.verification.isCorrect}`);
  console.log(`Difference: ₦${breakdown.verification.difference}`);
});

console.log('\n=== Example: ₦4000 Conference Fee ===');
const example = PaystackFeeCalculator.getDetailedBreakdown(4000);
console.log(`If conference base price is ₦${example.baseAmount}:`);
console.log(`- User pays: ₦${example.chargeAmount}`);
console.log(`- Paystack deducts: ₦${example.fees.totalFees}`);
console.log(`- Organization receives: ₦${example.verification.netAmount}`);
console.log(`- Calculation is correct: ${example.verification.isCorrect}`);
