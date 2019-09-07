"use strict";

const algoliasearch = require('algoliasearch');
const functions = require('firebase-functions');

const ALGOLIA_APP_ID=functions.config().algolia.app_id
const ALGOLIA_API_KEY=functions.config().algolia.api_key
const ALGOLIA_INDEX_NAME=functions.config().algolia.index_name

// configure algolia

exports.search = (properties) => {

  const { query, page = 0, hitsPerPage = 10 } = properties;

const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
var index = algolia.initIndex(ALGOLIA_INDEX_NAME);

return index
  .search({
    query,
    page,
    hitsPerPage
  })
  .then((responses) => ({recipes: responses.hits, total: responses.nbHits, totalPages: responses.nbPages}));
};

exports.get = (id) => {
  return new Promise((resolve, reject) => {
    const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    var index = algolia.initIndex(ALGOLIA_INDEX_NAME);

    index.getObject(id, (error, response) => {
      if (error)reject(error); else resolve(response);
    });
  }); 
}
