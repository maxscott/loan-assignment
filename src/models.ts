/**
 * Class describes the properties and methods ubiquitous to object which aggregate and query Covenant data.
 */
export abstract class Covenantable {
  abstract identifier: string;
  bannedStates: Set<string> = new Set()
  maxDefaultRate: number = null

  /**
   * Pre-process the covenants affecting this facility to make assignment simpler.
   * In this instance, we keep track of the most restrictive default rate, as well
   * as the total set of banned states.
   */
  addCovenant(covenant: Covenant) {
    if (covenant.maxDefaultLikelihood !== null) {
      this.maxDefaultRate = this.maxDefaultRate || covenant.maxDefaultLikelihood;
      this.maxDefaultRate = Math.min(this.maxDefaultRate, covenant.maxDefaultLikelihood);
    }

    if (covenant.bannedState) {
      this.bannedStates.add(covenant.bannedState)
    }

    return this;
  }

  /**
   * Validate that the loan can be assigned to this Covenantable object. 
   * Note, banks do not contain an "amount", and so amount validation is left
   * up to the facility in it's override of this method;
   *
   * @param loan The loan to be assigned this Covenantable object. 
   */
  validateAssignable(loan: Loan) {
    if (this.bannedStates.has(loan.state)) {
      throw new Error(`Facility ${this.identifier} has banned ${loan.state}`);
    }

    if (this.maxDefaultRate !== null && this.maxDefaultRate < loan.defaultLikelihood) {
      throw new Error(`Facility ${this.identifier}'s maxDefaultRate (${this.maxDefaultRate}) is exceeded by loan ${loan.id}'s rate of ${loan.defaultLikelihood}`);
    }
  }
}

export class Bank extends Covenantable {
  identifier: string

  constructor(
    public id: number,
    public name: string,
    public facilities: Array<Facility> = []
  ) {
    super();
    this.identifier = id.toString();
  }

  addFacility(facility: Facility) {
    this.facilities.push(facility);
  }
}

export class Facility extends Covenantable {
  identifier: string

  constructor(
    public id: number,
    public amount: number,
    public interestRate: number,
    public bank: Bank,
    public covenants: Array<Covenant> = []
  ) {
    super();
    this.identifier = id.toString();

    // ensure that all facitilies are related to their bank
    bank.addFacility(this);
  }

  /**
   * Validate that the loan can be assigned to this Covenantable object. 
   * @param loan The loan to be assigned this Covenantable object. 
   */
  validateAssignable(loan: Loan) {
    super.validateAssignable(loan);

    if (this.amount < loan.amount) {
      throw new Error(`Facility ${this.id} (${this.amount}) cannot fund loan (${loan.amount})`);
    }
  }
}

export class Covenant {
  constructor(
    public bank: Bank,
    public facility?: Facility,
    public maxDefaultLikelihood?: number,
    public bannedState?: string
  ) {
    // ensure that the covenants are available on all facilities
    if (facility) {
      facility.addCovenant(this);
    } else {
      bank.addCovenant(this);
    }
  }
}

export class Loan {
  constructor(
    public id: number,
    public interestRate: number,
    public amount: number,
    public defaultLikelihood: number,
    public state: string
  ) {}
}

export class Assignment {
  constructor(
    public loan: Loan,
    public facility: Facility
  ) {
    // Validatation that this facility/bank *can* be assigned to this loan
    facility.validateAssignable(loan);
    facility.bank.validateAssignable(loan);

    // Assignment is successful => update the facility's total amount
    facility.amount -= loan.amount;
  }

  /**
   * The assumed yield based on expected value, interest, and facility interest
   */
  expectedYield() {
    const repaymentValue = (1 - this.loan.defaultLikelihood) * this.loan.interestRate * this.loan.amount;
    const defaultValue = this.loan.defaultLikelihood * this.loan.amount;
    const facilityInterest = this.facility.interestRate * this.loan.amount;

    return repaymentValue - defaultValue - facilityInterest;
  }
}
