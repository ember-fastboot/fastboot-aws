"use strict";

module.exports = function(message) {
  return function(req, res) {
    res.status(500);

    let html = '<h1>Error: App Not Found</h1>';

    if (message) {
      html += `<p>${message}</p>`;
    }

    res.send(html);
  };
};
