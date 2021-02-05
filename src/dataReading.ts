import fs from 'fs';
import parseSync from 'csv-parse/lib/sync';
import parse from 'csv-parse';
import { Loan, Bank, Covenant, Facility } from './models';
import config from './config';

/**
 * Parse csv and convert strings to numbers for certain fields.
 *
 * NOTE: going forward, more scalable to define file schemas separately.
 */
function recordsByFileName(filename: string) {
  const file = fs.readFileSync(filename);

  return parseSync(file, {
    columns: true,
    cast: cast
  });
}

function cast(val: any, context: any) {
  switch(context.column) {
    case "id": return parseInt(val);
    case "facility_id": return parseInt(val);
    case "bank_id": return parseInt(val);
    case "amount": return parseInt(val);
    case "interest_rate": return parseFloat(val);
    case "default_likelihood": return parseFloat(val);
    case "max_default_likelihood": return (val && parseFloat(val)) || null;
    default: return val;
  }
}

/**
 * Loads banks covenants and facilities from csv files.
 * Covenants add themselves to their facilities or their bank (which in turn add them to facilities),
 * @returns Array<Facility> List of facilities with their covenants.
 */
export function loadDataset(): Array<Facility> {
  const bankRecords = recordsByFileName(`./${config.dataset}/banks.csv`);
  const covenantRecords = recordsByFileName(`./${config.dataset}/covenants.csv`);
  const facilityRecords = recordsByFileName(`./${config.dataset}/facilities.csv`);

  const banks = bankRecords.reduce((acc: Map<number, Bank>, r: any) => {
    return acc.set(r.id, new Bank(r.id, r.name));
  }, new Map<number, Bank>());


  const facilities: Map<number, Facility> = facilityRecords.reduce((acc: Map<number, Facility>, r: any) => {
    return acc.set(r.id, new Facility(
      r.id,
      r.amount,
      r.interest_rate,
      banks.get(r.bank_id)
    ));
  }, new Map<number, Facility>());

  // Adds the convenants to either bank or facility, see Covenent class
  covenantRecords.forEach((r: any) => {
    return new Covenant(
      banks.get(r.bank_id),
      facilities.get(r.facility_id),
      r.max_default_likelihood,
      r.banned_state
    );
  });

  return [...facilities.values()]
}

/**
 * Creates a read stream for loans, and runs callback on each.
 *
 * @returns Promise<void> Signifies the stream has ended.
 */
export function processLoanStream(loanCallback: (loan: Loan) => any): Promise<void> {
  const loanReader = fs.createReadStream(`./${config.dataset}/loans.csv`);

  const parseStream = parse({
    columns: true,
    cast: cast
  });

  loanReader.pipe(parseStream);

  parseStream.on("data", r => {
    loanCallback(
      new Loan(
        r.id,
        r.interest_rate,
        r.amount,
        r.default_likelihood,
        r.state
      )
    );
  });

  return new Promise((res, rej) => {
    parseStream.on("end", res);
    parseStream.on("error", rej);
  });
}
