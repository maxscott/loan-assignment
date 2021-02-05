import { Loan, Facility, Assignment } from './models';

/**
 * Assignment works by selecting the first facility which an Assignment is allowed for.
 * Facilities are traversed from low to high interest.
 * The assignment model is responsible for validating it's own creation.
 */
export class LoanAssigner {
  interestRateIndex: Array<Facility>

  /**
   * Pre-processes the facilities for easier future assignment.
   * In this instance, pre-processing includes sorting on low-to-high interest rates.
   *
   * @param Array<Facility> The facilities the assigner can choose from.
   */
  constructor(public facilities: Array<Facility>) {
    // Current state: scan by lowest interest rate
    this.interestRateIndex = [...facilities].sort((a, b) => {
      return a.interestRate < b.interestRate ? -1 : 1
    });
  }

  /**   
   * Attempt to create assignments, which check for all validation criteria.
   *
   * @param Loan The loan to assign.
   * @returns Assignment The assignment made for this loan.
   */
  assign(loan: Loan): Assignment | null {
    for (const facility of this.interestRateIndex) {
      try {
        return new Assignment(loan, facility);
      } catch (e) {
        console.debug(e.message);
      }
    }

    return null;
  }
}
