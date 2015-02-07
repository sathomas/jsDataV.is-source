/*global Running, Backbone, JST*/

Running.Views = Running.Views || {};

(function () {
    'use strict';

    Running.Views.Details = Backbone.View.extend({

        events: {
            'click button': 'clicked'
        },

        clicked: function () {
            this.trigger('summarize');
        },

        render: function () {
            this.$el.empty();
            this.$el.append(
                new Running.Views.Properties({model: this.model}).render().el
            );
            this.$el.append(
                new Running.Views.Charts({model: this.model}).render().el
            );
            this.$el.append(
                new Running.Views.Map({model: this.model}).render().el
            );
            this.$el.append(
                $("<button>").text("Back")
            );
            return this;
        }

    });

})();
