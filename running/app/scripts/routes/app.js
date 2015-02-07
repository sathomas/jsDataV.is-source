/*global Running, Backbone*/

Running.Routers = Running.Routers || {};

(function () {
    'use strict';

    Running.Routers.App = Backbone.Router.extend({
        routes: {
            '':         'summary',
            'runs/:id': 'details'
        },

        initialize: function() {
            // Since we're not connecting to the real Nike+ API,
            // Load the collection from the sample data on
            // initialization. We'll need this collection no
            // matter which route is active. Force a reset event
            // so any views can catch the update.
            this.runs = new Running.Collections.Runs();
            this.runs.fetch({reset:true});

            // Start push state history
            Backbone.history.start({pushState: true});
        },

        summary: function() {
            // Clean up any existing details view.
            if (this.detailsView) {
                this.detailsView.off('summarize');
                this.detailsView.remove();
                this.detailsView = null;
            }
            // We only need to create the summary view once.
            if (!this.summaryView) {
                this.summaryView = new Running.Views.Summary({collection: this.runs});
                this.summaryView.render();
                this.summaryView.on('select', this.selected, this);
            }
            $('body').html(this.summaryView.el);
        },

        selected: function(id) {
            this.navigate('runs/' + id, { trigger: true });
        },

        details: function(id) {
            if (this.summaryView) {
                this.summaryView.$el.detach();
            }
            this.detailsView = new Running.Views.Details({model: this.runs.get(id)});
            $('body').html(this.detailsView.render().el);
            this.detailsView.on('summarize', this.summarize, this);
        },

        summarize: function() {
            this.navigate('', { trigger: true });
        }

    });

})();
