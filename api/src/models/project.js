import db from '../database.js';
import * as Query from '../utils/query';
import { rejectMessage } from '../utils/promise';
import k from '../constants';

function findById(id) {
  if (!id) return Promise.resolve(null);
  return db
    .selectOne(
      `
      SELECT project.*,
             array_agg(tag.text) AS tags,
             row_to_json(user_account.*) AS author,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', project_document.id,
                   'name', project_document.name
                 )
               )
               FILTER (
                 WHERE project_document.id IS NOT NULL
                 AND project_document.name IS NOT NULL
               ),
               '[]'
             ) as documents
        FROM project
             LEFT JOIN tag ON tag.id = ANY(project.tag_id)
             LEFT JOIN project_document ON project.id = project_document.project_id
             LEFT JOIN user_account ON user_account.id = project.author_id
       GROUP BY project.id, user_account.id
      HAVING project.id = @id
      `,
      { id }
    )
    .then(data => ({
      ...data,
      documents: Array.from(
        new Set(data.documents.map(document => document.id))
      ).map(id => data.documents.find(document => document.id === id)),
      tags: Array.from(new Set(data.tags))
    }))
    .catch(err =>
      err.type === k.ROW_NOT_FOUND
        ? rejectMessage('Project not found', k.PROJECT_NOT_FOUND)
        : Promise.reject(err)
    );
}

function details(id, userId, isAdmin = false) {
  if (!id)
    return Promise.resolve(null);

  return db
    .selectOne(`
      SELECT project.*,
             row_to_json((SELECT d FROM (SELECT
               user_account.first_name as first_name,
               user_account.last_name,
               user_account.approved,
               user_account.email
             ) d)) as "author",
             professor.department,
             array_agg(tag.text) as tags
        FROM project
             JOIN user_account ON project.author_id = user_account.id
             LEFT JOIN professor ON project.author_id = professor.user_id
             LEFT JOIN tag ON tag.id = ANY(project.tag_id)
       GROUP BY project.id,
             user_account.first_name,
             user_account.last_name,
             user_account.email,
             user_account.approved,
             professor.department
      HAVING project.id = @id
      `,
      { id }
    )
    .then(details =>
      details.authorId === userId || isAdmin
        ? findById(details.id)
        : details
    )
    .catch(err =>
      err.type === k.ROW_NOT_FOUND
        ? rejectMessage('Project not found', k.PROJECT_NOT_FOUND)
        : Promise.reject(err)
    );
}

function create(project) {
  const { columns, values } = Query.toColumns(project);
  return db
    .insert(
      `
      INSERT INTO project (${columns})
      VALUES (${values})
      `,
      project
    )
    .then(findById);
}

function list(isAdmin = false) {
  return db.selectAll(
    `
    SELECT project.id,
           project.title,
           project.abstract,
           project.author_id,
           project.start_date,
           project.timeframe,
           project.axis,
           project.organizations,
           project.open_for_students,
           project.approved,
           row_to_json((SELECT d FROM (SELECT
             user_account.first_name as first_name,
             user_account.last_name,
             user_account.approved,
             user_account.email
           ) d)) as "author",
           array_agg(tag.text) as tags
      FROM project
           JOIN user_account ON project.author_id = user_account.id
           LEFT JOIN tag ON tag.id = ANY(project.tag_id)
     GROUP BY project.id,
           user_account.email,
           user_account.first_name,
           user_account.last_name,
           user_account.approved,
           project.approved
    ${isAdmin ? '' : `HAVING user_account.approved = true`}
    `
  );
}

function listUserProjects(id) {
  return db.selectAll(
    `
    SELECT project.id,
           project.title,
           project.abstract,
           project.author_id,
           project.start_date,
           project.timeframe,
           project.axis,
           project.organizations,
           project.open_for_students,
           project.approved,
           row_to_json((SELECT d FROM (SELECT
             user_account.first_name as first_name,
             user_account.last_name,
             user_account.approved,
             user_account.email
           ) d)) as "author",
           array_agg(tag.text) as tags
      FROM project
           JOIN user_account ON project.author_id = user_account.id
           LEFT JOIN tag ON tag.id = ANY(project.tag_id)
     WHERE project.author_id = @id
     GROUP BY project.id,
           user_account.email,
           user_account.first_name,
           user_account.last_name,
           user_account.approved,
           project.approved
    `,
    { id }
  );
}

function search({ term, keywords }, isAdmin = false) {
  return db.selectAll(
    `
    SELECT project.id,
           project.title,
           project.abstract,
           project.author_id,
           project.start_date,
           project.timeframe,
           project.axis,
           project.organizations,
           project.open_for_students,
           project.approved,
           user_account.email,
           row_to_json((SELECT d FROM (SELECT
             user_account.first_name as first_name,
             user_account.last_name,
             user_account.approved,
             user_account.email
           ) d)) as "author",
           array_agg(tag.text) as tags
      FROM project
           JOIN user_account ON project.author_id = user_account.id
           LEFT JOIN tag ON tag.id = ANY(project.tag_id)
     GROUP BY project.id,
           user_account.first_name,
           user_account.last_name,
           user_account.approved,
           user_account.email,
           project.approved
    HAVING LOWER(project.title) LIKE LOWER(@term)
           AND project.tag_id @> @keywords
           ${isAdmin ? '' : `AND user_account.approved = true`}
    `,
    { term: `%${term}%`, keywords }
  );
}

function update(project) {
  const { id, userId, ...change } = project;
  const mapping = Query.toMapping(change);
  return db
    .query(
      `
      UPDATE project
         SET ${mapping}
       WHERE author_id = @userId
             AND id = @id
   RETURNING id
    `,
      project
    )
    .then(res =>
      res.rowCount === 0
        ? rejectMessage('Project not found', k.PROJECT_NOT_FOUND)
        : findById(id)
    );
}

function deleteProject(id) {
  return db.query(`DELETE FROM project_document WHERE project_id = @id`, { id })
  .then(() => db.query(`DELETE FROM project WHERE id = @id`, { id }))
  .then(res =>
    res.rowCount === 0
      ? rejectMessage('Project not found', k.PROJECT_NOT_FOUND)
      : true
  );
}

function addDocument(location, id, name) {
  const data = {
    key: location,
    projectId: id,
    name
  };
  const { columns, values } = Query.toColumns(data);
  return db.insert(
    `
    INSERT INTO project_document (${columns})
    VALUES (${values})
    `,
    data
  );
}

function projectId(id, userId) {
  return db
    .selectOne(
      `
    SELECT project.id
      FROM project
           LEFT JOIN project_document ON project.id = project_document.project_id
     WHERE project_document.id = @id
           AND project.author_id = @userId
    `,
      { id, userId }
    )
    .catch(err =>
      err.type === k.ROW_NOT_FOUND
        ? rejectMessage('Project not found', k.PROJECT_NOT_FOUND)
        : Promise.reject(err)
    );
}

function deleteDocument(id, userId) {
  return projectId(id, userId).then(() =>
    db.selectOne(
      `
        DELETE
          FROM project_document
         WHERE id = @id
     RETURNING project_document.key as Key
      `,
      { id }
    )
  );
}

function findDocumentById(id) {
  if (!id) return Promise.resolve(null);
  return db
    .selectOne(
      `
      SELECT *
        FROM project_document
       WHERE id = @id
      `,
      { id }
    )
    .catch(err =>
      err.type === k.ROW_NOT_FOUND
        ? rejectMessage('Document not found', k.ACCOUNT_NOT_FOUND)
        : Promise.reject(err)
    );
}

function approveMatch(id) {
  return db.query(
    `
    UPDATE project
       SET approved = true
     WHERE id = @id
    `,
    { id }
  );
}

function disapproveMatch(id) {
  return db.query(
    `
    UPDATE project
       SET approved = false
     WHERE id = @id
    `,
    { id }
  );
}

export default {
  create,
  findById,
  list,
  search,
  details,
  listUserProjects,
  update,
  deleteProject,
  addDocument,
  deleteDocument,
  findDocumentById,
  projectId,
  approveMatch,
  disapproveMatch
};
