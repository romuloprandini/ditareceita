"use strict";

var mongo = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
const functions = require("firebase-functions");

const MONGODB_URL = functions.config().mongodb.url;
const MONGODB_USERNAME = functions.config().mongodb.username;
const MONGODB_PASSWORD = functions.config().mongodb.password;

// configure algolia

async function getMongoClient() {
  return await mongo.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: "admin",
    auth: {
      user: MONGODB_USERNAME,
      password: MONGODB_PASSWORD
    }
  });
}

exports.search = async properties => {
  const { term, page = 0, hitsPerPage = 10 } = properties;

  const mongoClient = await getMongoClient();
  const recipes = mongoClient.db("recipes").collection("recipes");
  try {
    const query = recipes.find({ $text: { $search: '"'+term+'"', $language: 'pt', $caseSensitive:false, $diacriticSensitive: true } });
    const total = await query.count();
    if (total < 1) {
      return {
        recipes: [],
        total: 0,
        totalPages: 0
      };
    }
    return await query
      .project({ score: { $meta: "textScore" } })
      .sort({score:{$meta:"textScore"}})
      .skip(hitsPerPage * page)
      .limit(hitsPerPage)
      .toArray()
      .then(items => {
        return {
          recipes: items.map(item => {
            item.id = item._id.toString();
            delete item['_id'];
            return item;
          }),
          total: total,
          totalPages: Math.ceil(total / hitsPerPage)
        };
      });
  } finally {
    mongoClient.close();
  }
};

exports.get = async id => {
  const mongoClient = await getMongoClient();
  const recipes = mongoClient.db("recipes").collection("recipes");
  try {
    return await recipes.findOne({ _id: new ObjectID(id) });
  } finally {
    mongoClient.close();
  }
};
