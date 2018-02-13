#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, './../src/sidebar/templates/');
const dirOfTranslations = path.resolve(__dirname, './../src/sidebar/translations/');

// Return a list of strings in all the files in the given directory
function getTheListOfStrings(dir) {
  let stringList = [];
  var files = fs.readdirSync(dir);

  files.forEach(function(file){
    const fileContent = fs.readFileSync(dir + '/'+ file, 'utf-8');

    if(fileContent.indexOf('translate') >= 0){
      var stringsInTheFile = fileContent.match(/['"](.*?)\|\s*translate[^})'"]*/g).map(function(val){
        return val.match(/'([^']+)'/)[1];
      });

      stringsInTheFile.forEach(function(string){
        stringList.push(string);
      });
    }
  });
  return stringList;
}

// Get the list (Javascript Objects) of the new strings that needs to be translated
function getNewTranslationStrings(translationFile, listOfStrings){
  var data = {};
  const translation_file_content = fs.readFileSync(dirOfTranslations + '/' + translationFile, 'utf-8');
  listOfStrings.forEach(function(string){
    if(translation_file_content.indexOf(string) >= 0){return;}
    else{
      data[string] = string;
    }
  });
  return  data;
}

// Write the new strings to the translation File

function writeTheStringsToTheTranslationFile(translationFile, newStrings){
  fs.readFile(dirOfTranslations + '/' + translationFile, function(err, data){
    if(err){throw err;}
    else {
      var translations = JSON.parse(data);
      var obj = Object.assign({}, translations, newStrings);
      const new_content = JSON.stringify(obj, null, 4);
      fs.writeFile(dirOfTranslations + '/' +translationFile, new_content,function(error){
        if(error){throw error;}
        else {
          console.log('Successful!');
        }
      });
    }
  });
}

// Update all the translation files
function updateAllTranslationFiles(translationFilesList,listOfStrings){
  translationFilesList.forEach(function(translationFile){
    const newStrings = getNewTranslationStrings(translationFile, listOfStrings);
    writeTheStringsToTheTranslationFile(translationFile,newStrings);
  });
}

// Get all the strings that need to be translated from HTML Templates
const listOfStrings = getTheListOfStrings(dir);
console.log(listOfStrings);
// const allTranslationFiles = fs.readdirSync(dirOfTranslations);
// updateAllTranslationFiles(allTranslationFiles,listOfStrings);

