// Global variables
var searchResultsArray; // Search results 
var titles; // Array of titles from search results
var titleString; //Giant string of title0|title1|title2 etc, 
// used for a second API request with the searching.
var extracts; // Array of extracts from search results
var randomTitles; // Array of 15 random titles
var randomExtracts;
var randomTitlesDisplayCopy; // Display function creates its // own copy so that they can be displayed via roulette wheel // while more are being grabbed.
var randomExtractsDisplayCopy;

// Function to grab 8 Wikipedia titles for a search phrase.
// Apparently this could be done more briefly with //$.getJSON("https://en.wikipedia.org/w/api.php?action=query&format=json&gsrlimit=15&generator=search&origin=*&gsrsearch=" + q, function(data){ 
// etc, but that was from a freecodecamp user on StackOverflow, so it seemed unfair to use.
function searchWikipedia(searchPhrase) {
  return $.ajax({
    url: "https://en.wikipedia.org/w/api.php",
    //jsonp: "callback", // seems unnecessary
    dataType: 'jsonp',
    data: {
      action: "query",
      list: "search",
      format: "json",
      srsearch: searchPhrase,
      srlimit: 8
    },
    //xhrFields: {
    //  withCredentials: true  //Seems unnecessary
    //},
    success: function(response) {
      searchResultsArray = response.query.search;
      titleString = "";
      for (i = 0; i < searchResultsArray.length; i++) {
        title = searchResultsArray[i].title;
        // Check for ampersands since it will be a PHP link:
        title = title.replace(/&/g, "%26");
        titleString += "|" + title;
      }
      titleString = titleString.substring(1);
    }
  });
}

// Function to get extracts for the articles found with the 
// search function. Also fills the titles array, since the 
// pages are provided as not-necessarily-ordered objects, and 
// we want to make sure the titles and extracts match.
function getExtracts() {
  if (searchResultsArray.length === 0) {
    return; //Skip to display step
  }
  url = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&exlimit=max&exsentences=2&origin=*&format=json&titles=" + titleString;
  return $.getJSON(url, function(data) {
    titles = [];
    extracts = [];
    for (var pageID in data.query.pages) {
      title = data.query.pages[pageID].title;
      extract = data.query.pages[pageID].extract;
      titles.push(title);
      extracts.push(extract);
    }
  });
}

// Function to display search results.
function displaySearchResults() {
  $("#search-results").html("");
  if (searchResultsArray.length === 0) {
    $("#search-results").html('<li class="list-group-item no-results">Sorry, no results found.</li>');
    $("#search-results").show();
    $("#search-button").prop('disabled', false);
    return;
  }
  for (i = 0; i < searchResultsArray.length; i++) {
    // Some articles don't have summaries:
    if (!extracts[i]) {
      extracts[i] = "<p><i>(No summary provided)</i></p>"
    } else {
      // Some extracts are just intros to a bulleted list:
      lastCharIndex = extracts[i].length - 5;
      if (extracts[i][lastCharIndex] === ":") {
        extracts[i] = extracts[i].substring(0, lastCharIndex + 1) + " ...</p>";
      }
    }
    $("#search-results").append('<li class="list-group-item result"><div class="article-title"><a href="https://en.wikipedia.org/wiki/' + titles[i].replace(/\s/g, "_") + '" target="_blank">' + titles[i] + '</a></div><div class="article-preview">' + extracts[i] + '</div></li>');
  }
  $("#search-results").show();
  $("#search-button").prop('disabled', false);
}

function search() {
  var searchText = $('#search-text').val();
  if (searchText === "") {
    return;
  }
  $("#search-button").prop('disabled', true);

  $("#search-results").hide();
  searchWikipedia(searchText).then(getExtracts).then(displaySearchResults);
}

// Getting 15 random articles using ajax and a generator.
// Could have also used .getJSON and this url:
// https://en.wikipedia.org/w/api.php?action=query&generator=random&grnlimit=10&grnnamespace=0&prop=extracts&exintro=true&exlimit=max&exsentences=1&origin=*&format=json
// Wanted to try something different.
function getRandomArticles() {
  pendingRequest = true;
  randomsReadyPromise = $.ajax({
    url: "https://en.wikipedia.org/w/api.php",
    //jsonp: "callback", // Even this seems unnecessary...
    dataType: 'jsonp',
    data: {
      action: "query",
      generator: "random",
      grnlimit: 15,
      grnnamespace: 0, // This refers to the main page category (as opposed to, for example, talk pages)
      prop: "extracts",
      exintro: true,
      exlimit: "max",
      exsentences: 2,
      //origin: "*", //this also appears to be unnecessary
      format: "json"
    },
    //Seems xhrFields part is unnecessary
    //xhrFields: {
    //  withCredentials: true
    //},
    success: function(data) {
      randomTitles = [];
      randomExtracts = [];
      for (var pageID in data.query.pages) {
        title = data.query.pages[pageID].title;
        extract = data.query.pages[pageID].extract;
        lastCharIndex = extract.length - 5;
        if (extract[lastCharIndex] === ":") {
          extract = extract.substring(0, lastCharIndex + 1) + " ...</p>";
        }
        randomTitles.push(title);
        randomExtracts.push(extract);
      }
      console.log(randomTitles);
      pendingRequest = false;
    }
  });
  return randomsReadyPromise;
}

function displayRandomArticle() {
  randomTitlesDisplayCopy = randomTitles.slice(0);
  randomExtractsDisplayCopy = randomExtracts.slice(0);
  $("#search-results").html("");
  i = 0;
  rouletteLoop();
}

function rouletteLoop() {
  window.setTimeout(function() {
    $("#search-results").html('<li class="list-group-item result"><div class="article-title"><a href="https://en.wikipedia.org/wiki/' + randomTitlesDisplayCopy[i].replace(/\s/g, "_") + '" target="_blank">' + randomTitlesDisplayCopy[i] + '</a></div><div class="article-preview">' + randomExtractsDisplayCopy[i] + '</div></li>');
    i++;
    if (i < randomTitlesDisplayCopy.length) {
      rouletteLoop();
    } else {
      $('#random').prop('disabled', false);
    }
  }, 20 + i * i - i);
}

function random() {
  $('#random').prop('disabled', true); // Clicking while 
  // wheel is spinning causes errors and is unnecessary.

  // If the random articles are cued up, randomsReadyPromise
  // is already fulfilled. Otherwise, the display will wait 
  // until the promise is fulfilled.
  randomsReadyPromise.then(displayRandomArticle);

  // Cue up the next batch of articles.
  getRandomArticles();
}

$("#search-button").on('click', search);

// Allow search via enter key.
$("#search-text").keypress(function(event) {
  if (event.which == 13) {
    event.preventDefault();
    search();
  }
});

$("#random").on('click', random);

$().ready(getRandomArticles);

//$("#random").on('click', function() {
//  window.open('https://en.wikipedia.org/wiki/Special:Random', '_blank');
//});

/* Next steps:
XXXXXXget the links
XXXXXXrandom roulette wheel?
XXXXXXsearch entry
XXXXXXdeal with failure cases
XXXXXXuse hidden/shown divs
XXXXXXfix smaller num results after larger num
XXXXXXHit return to search
Customize appearance (title font?)
Add signature
Try both ways to do the random button
*/