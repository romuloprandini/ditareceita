"use strict";

const { SimpleResponse } = require("actions-on-google");

exports.constants = {
  SELECTED_RECIPE_CONTEXT: "selectedrecipe-followup",
  INGREDIENTS_TYPE: "ingredients",
  PREPARATION_TYPE: "preparation"
};

exports.response = (text, speech) => {
  speech = speech || text;
  return new SimpleResponse({
    speech: `<speak>${speech}</speak>`,
    text
  });
}


exports.totalTimeToString = (totalTime)  => {
  totalTime = totalTime.replace('PT','');
  if(totalTime.indexOf('H') > -1 && totalTime.indexOf('M') > -1) {
    totalTime = totalTime.replace('H',':').replace('M','');
    if(totalTime.indexOf(':') < 2) {
      totalTime = '0'+totalTime;
    }
    if(totalTime.indexOf(':') === totalTime.length - 2) {
      totalTime = totalTime.substr(0, totalTime.indexOf(':') + 1) + '0' + totalTime.substr(totalTime.indexOf(':') + 1);
    }
    return totalTime;
  } 
  else if(totalTime.indexOf('H') > -1) {
    totalTime = totalTime.replace('H','');
    if(totalTime === '1') {
    return totalTime + ' Hora';
    }
    return totalTime + ' Horas';
  } 
  else if(totalTime.indexOf('M') > -1) {
    totalTime = totalTime.replace('M','');
    if(totalTime === '1') {
    return totalTime + ' Minuto';
    }
    return totalTime + ' Minutos';
  }
  return 'N/I';
}
