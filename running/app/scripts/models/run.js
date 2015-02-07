/*global Running, Backbone*/

Running.Models = Running.Models || {};

(function () {
    'use strict';

    Running.Models.Run = Backbone.Model.extend({

        idAttribute: 'activityId',

        url: 'https://api.nike.com/v1/me/sport/activities/',

        initialize: function() {
        },

        defaults: {
        },

        validate: function(attrs, options) {
        },

        parse: function(response, options)  {
            return response;
        }
    });

})();
