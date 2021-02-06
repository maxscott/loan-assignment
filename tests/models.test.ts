import {expect} from 'chai';
import {mock, when, instance}  from 'ts-mockito';
import {Covenantable, Covenant, Facility, Bank, Loan} from '../src/models';
import {doesNotThrow, throws} from 'assert';

context("Bank", () => {
  let subject: Bank;

  beforeEach(() => {
    subject = new Bank(5, "Bofa");
  });

  describe("#addFacility()", () => {
    it("appends to the list of facilities", () => {
      expect(subject.facilities).to.have.lengthOf(0);

      [
        mock<Facility>(),
        mock<Facility>(),
        mock<Facility>()
      ].forEach(f => {
        subject.addFacility(instance(f));
      });

      expect(subject.facilities).to.have.lengthOf(3);
    });
  });
});

context("Covenantable", () => {
  let subject: TestClass;

  class TestClass extends Covenantable {
    identifier: string
    constructor() {
      super();
      this.identifier = "t";
    }
  }

  beforeEach(() => {
    subject = new TestClass();
  });

  describe("initial state", () => {
    it("sets identifier", () => {
      expect(subject.identifier).to.equal("t");
    });

    it("initializes bannedStates", () => {
      expect(subject.bannedStates).to.be.empty;
    });

    it("initializes maxDefaultRate", () => {
      expect(subject.maxDefaultRate).to.be.null;
    });
  });

  describe("#validateAssignable()", () => {
    let loan: Loan;

    beforeEach(() => {
      loan = mock<Loan>();
      when(loan.state).thenReturn("NY");
      when(loan.defaultLikelihood).thenReturn(0.2);
    });

    it("allows assignment on init", () => {
      doesNotThrow(() => {
        subject.validateAssignable(instance(loan));
      })
    });

    it("allows assignment with some covenant", () => {
      doesNotThrow(() => {
        subject.bannedStates = new Set(["CT"]);
        subject.maxDefaultRate = 0.3;
        subject.validateAssignable(instance(loan));
      })
    });

    it("forbids assignment with banned state", () => {
      throws(() => {
        subject.bannedStates = new Set(["NY"]);
        subject.validateAssignable(instance(loan));
      });
    });

    it("forbids assignment with max default likelihood", () => {
      throws(() => {
        subject.maxDefaultRate = 0.15;
        subject.validateAssignable(instance(loan));
      });
    });
  });

  describe("#addCovenant()", () => {
    let covenant: Covenant;

    beforeEach(() => {
      covenant = mock<Covenant>();
    });

    it("maintains a total set of bannedStates", () => {
      expect(subject.bannedStates).to.deep.equal(new Set());

      const valExpectation: Array<
        [ string | null, Array<string> ]
      > = [
        [null, []],
        ["NY", ["NY"]],
        ["NY", ["NY"]],
        ["CT", ["NY", "CT"]],
        ["CA", ["NY", "CA", "CT"]]
      ];

      for (const [val, exp] of valExpectation) {
        when(covenant.bannedState).thenReturn(val);
        subject.addCovenant(instance(covenant));
        expect([...subject.bannedStates.values()]).to.have.members(exp);
      }
    });

    it("maintains maxDefaultRate as min of covenant's values", () => {
      expect(subject.maxDefaultRate).to.equal(null);

      const valExpectation = [
        [.08, .08],
        [.05, .05],
        [.06, .05],
        [null, .05],
        [.04, .04],
        [.14, .04]
      ];

      for (const [val, exp] of valExpectation) {
        when(covenant.maxDefaultLikelihood).thenReturn(val);
        subject.addCovenant(instance(covenant));
        expect(subject.maxDefaultRate).to.equal(exp);
      }
    });
  });
});
