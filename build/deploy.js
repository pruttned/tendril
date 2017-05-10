'use strict';

var ghpages = require('gh-pages');

ghpages.publish('dist', {
    message : 'Deploy'
}, err => {
    if (err) {
        console.error(err);
    }
});