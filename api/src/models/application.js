import db from '../database.js';
import * as Query from '../utils/query';
import { rejectMessage } from '../utils/promise';
import k from '../constants';

function findById(id) {
  if (!id) return Promise.resolve(null);
  return db
    .selectOne(
      `
      SELECT * FROM application
       WHERE id = @id
      `,
      { id }
    )
    .catch(err =>
      err.type === k.ROW_NOT_FOUND
        ? rejectMessage('Application not found', k.APPLICATION_NOT_FOUND)
        : Promise.reject(err)
    );
}

function findByApplicantProject({ projectId, applicantId }) {
  return db
    .selectOne(
      `
      SELECT * FROM application
       WHERE project_id = @projectId
             AND applicant_id = @applicantId
      `,
      { projectId, applicantId }
    )
    .catch(err =>
      err.type === k.ROW_NOT_FOUND
        ? rejectMessage('Application not found', k.APPLICATION_NOT_FOUND)
        : Promise.reject(err)
    );
}

function create(application) {
  const { columns, values } = Query.toColumns(application);
  return db
    .insert(
      `
      INSERT INTO application (${columns})
      VALUES (${values})
      `,
      application,
      'id'
    )
    .then(findById);
}

function update(application) {
  return db
    .insert(
      `
      UPDATE application
         SET proposal = @proposal
       WHERE id = @applicationId
             AND applicant_id = @applicantId
      `,
      application,
      'id'
    )
    .then(findById);
}

export default {
  create,
  findById,
  findByApplicantProject,
  update
};