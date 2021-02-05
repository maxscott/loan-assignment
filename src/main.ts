import os from 'os';
import fs from 'fs';
import config from './config';
import { loadDataset, processLoanStream } from './dataReading';
import { LoanAssigner } from './loanAssigner';

export default async function main() {
  // Establish write streams
  const assignmentWriter = fs.createWriteStream(`./${config.dataset}/assignments.csv`);
  const yieldWriter = fs.createWriteStream(`./${config.dataset}/yields.csv`);

  // Write csv headers
  assignmentWriter.write("loan_id,facility_id" + os.EOL);
  yieldWriter.write("facility_id,expected_yield" + os.EOL);

  // Load data and prepare to use facilities to assign
  const assigner = new LoanAssigner(loadDataset());

  const yields = {};

  // Process loans in stream, awaiting end of stream
  await processLoanStream(loan => {

    // Attempt to assign loan to a facility
    const assignment = assigner.assign(loan);

    if (assignment) {
      const facilityId = assignment.facility.id;
      
      // Output assignment
      assignmentWriter.write(`${assignment.loan.id},${facilityId}${os.EOL}`);

      // Calculate and aggregate yield 
      yields[facilityId] = yields[facilityId] || 0;
      yields[facilityId] += assignment.expectedYield();
    }
  });

  // Output yields to file
  for (const key of Object.keys(yields)) {
    const val = Math.floor(yields[key] * 100) / 100;
    yieldWriter.write(`${key},${val}${os.EOL}`);
  }
}
