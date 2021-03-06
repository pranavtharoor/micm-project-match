import React from 'react';
import PropTypes from 'prop-types';
import './projectListItem.scss';
import { Link } from 'react-router-dom';
import { identity } from 'ramda';

const name = (firstName, lastName) =>
  firstName && lastName
    ? ` ${firstName} ${lastName}`
    : firstName
    ? ` ${firstName}`
    : lastName
    ? ` ${lastName}`
    : '';

const ProjectListItem = ({
  project: { author, title, abstract, id, authorId, tags, approved }
}) => (
  <div className="project-list-item">
    <Link to={`/projects/${id}`} className="details">
      <div className="title">
        <div>{title}</div>
        <div className="approved">{approved && 'Approved'}</div>
      </div>
      <div className="abstract">
        {abstract.substring(0, 335)}
        {abstract.length > 335 ? '...' : ''}
      </div>
    </Link>
    <div className="by">
      <span>Project by</span>
      <Link to={`/user/${authorId}`}>
        {name(author.firstName, author.lastName)}
      </Link>
    </div>
    <div className="tags">
      {tags.filter(Boolean).map((tag, i) =>
        <div key={`tag_${i}`} className="tag">
          {tag}
        </div>)
      }
    </div>
  </div>
);

ProjectListItem.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    abstract: PropTypes.string.isRequired,
    authorId: PropTypes.number.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string),
    approved: PropTypes.bool,
    author: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string
    })
  }).isRequired
};

export default ProjectListItem;
