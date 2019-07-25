import { Project } from '../models';
import { errorHandler, dataHandler } from '../utils/handlers';
import * as File from '../utils/file';

function create(req, res) {
  // TODO add tags
  function uploadFiles(project) {
    return req.files.map(file =>
      File.upload({
        Key: `projects/${project.id}/documents/${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype
      }).then(file => Project.addDocument(file, project.id))
    );
  }

  Project.create({
    ...req.body,
    authorId: req.user.id
  }).then(project => {
    const fileUploads = uploadFiles(project);
    Promise.all(fileUploads)
      .then(() => dataHandler(res)(project))
      .catch(errorHandler(res));
  });
}

function update(req, res) {
  Project.update({ ...req.body, authorId: req.user.id })
    .then(dataHandler(res))
    .catch(errorHandler(res));
}

function list(req, res) {
  Project.selectAll()
    .then(dataHandler(res))
    .catch(errorHandler(res));
}

function search(req, res) {
  Project.search(req.query)
    .then(dataHandler(res))
    .catch(errorHandler(res));
}

function details(req, res) {
  Project.details(req.params.id, req.user.id)
    .then(dataHandler(res))
    .catch(errorHandler(res));
}

function listUserProjects(req, res) {
  Project.listUserProjects(req.user.id)
    .then(dataHandler(res))
    .catch(errorHandler(res));
}

export default {
  create,
  update,
  list,
  search,
  details,
  listUserProjects
};
