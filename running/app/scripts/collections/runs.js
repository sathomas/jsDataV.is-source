/*global Running, Backbone*/

Running.Collections = Running.Collections || {};

(function () {
    'use strict';

    Running.Collections.Runs = Backbone.Collection.extend({

        /*
         * Instead of using the real Nike+ API, fetch the
         * data from a local file. This avoids the complications
         * of dealing with authentication, etc.
         */
        url: 'data/runs.json',
        model: Running.Models.Run

    });

})();
