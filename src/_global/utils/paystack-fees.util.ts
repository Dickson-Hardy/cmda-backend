/**
 * Paystack Fee Calculation Utility
 *
 * Calculates the amount to charge users so that after Paystack deducts their fees,
 * the organization receives the exact desired amount.
 *
 * Paystack charges 1.5% + ₦100 for transactions using split codes.
 */

export class PaystackFeeCalculator {
  // Paystack standard settlement fees for split code transactions
  private static readonly PAYSTACK_PERCENTAGE_FEE = 0.015; // 1.5%
  private static readonly PAYSTACK_FIXED_FEE = 100; // ₦100

  /**
   * Calculate the amount to charge the user so that after Paystack fees,
   * the organization receives the exact desired amount.
   *
   * Formula: amount_to_charge = (desired_amount + fixed_fee) / (1 - percentage_fee)
   *
   * @param desiredAmount - The amount you want to receive after fees (in Naira)
   * @returns The amount to charge the user (in Naira, rounded to 2 decimal places)
   */
  static calculateChargeAmount(desiredAmount: number): number {
    if (desiredAmount <= 0) {
      throw new Error('Desired amount must be greater than 0');
    }

    // Formula: charge_amount = (desired_amount + fixed_fee) / (1 - percentage_fee)
    const chargeAmount =
      (desiredAmount + this.PAYSTACK_FIXED_FEE) / (1 - this.PAYSTACK_PERCENTAGE_FEE); // Round to whole number to avoid decimals in the final amount
    return Math.round(chargeAmount);
  }

  /**
   * Calculate the fees that will be deducted by Paystack
   *
   * @param chargeAmount - The amount being charged to the user
   * @returns Object containing breakdown of fees
   */
  static calculateFees(chargeAmount: number): {
    percentageFee: number;
    fixedFee: number;
    totalFees: number;
    netAmount: number;
  } {
    if (chargeAmount <= 0) {
      throw new Error('Charge amount must be greater than 0');
    }

    const percentageFee = Math.round(chargeAmount * this.PAYSTACK_PERCENTAGE_FEE);
    const fixedFee = this.PAYSTACK_FIXED_FEE;
    const totalFees = percentageFee + fixedFee;
    const netAmount = chargeAmount - totalFees;

    return {
      percentageFee,
      fixedFee,
      totalFees,
      netAmount: Math.round(netAmount),
    };
  }

  /**
   * Verify that the fee calculation is correct
   *
   * @param desiredAmount - The amount you want to receive
   * @param chargeAmount - The amount calculated to charge
   * @returns True if the calculation is correct (within 1 Naira tolerance)
   */
  static verifyCalculation(desiredAmount: number, chargeAmount: number): boolean {
    const fees = this.calculateFees(chargeAmount);
    const difference = Math.abs(fees.netAmount - desiredAmount);

    // Allow for 1 Naira tolerance due to rounding
    return difference <= 1;
  }

  /**
   * Get a detailed breakdown of the fee calculation for display purposes
   *
   * @param desiredAmount - The base price before fees
   * @returns Detailed breakdown object
   */
  static getDetailedBreakdown(desiredAmount: number): {
    baseAmount: number;
    chargeAmount: number;
    fees: {
      percentageFee: number;
      fixedFee: number;
      totalFees: number;
    };
    verification: {
      netAmount: number;
      isCorrect: boolean;
      difference: number;
    };
  } {
    const chargeAmount = this.calculateChargeAmount(desiredAmount);
    const fees = this.calculateFees(chargeAmount);
    const verification = {
      netAmount: fees.netAmount,
      isCorrect: this.verifyCalculation(desiredAmount, chargeAmount),
      difference: Math.abs(fees.netAmount - desiredAmount),
    };

    return {
      baseAmount: desiredAmount,
      chargeAmount,
      fees: {
        percentageFee: fees.percentageFee,
        fixedFee: fees.fixedFee,
        totalFees: fees.totalFees,
      },
      verification,
    };
  }
}

// Example usage and testing
export function testPaystackFeeCalculator(): void {
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
}
