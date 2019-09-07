"use strict";

const { SimpleResponse } = require("actions-on-google");

exports.response = (text, speech) => {
  speech = speech || text;
  return new SimpleResponse({
    speech: `<speak>${speech}</speak>`,
    text
  });
}
