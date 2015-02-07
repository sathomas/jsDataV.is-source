/*global Running, Backbone, JST*/

Running.Views = Running.Views || {};

(function () {
    'use strict';

    Running.Views.Summary = Backbone.View.extend({

        template: JST['app/scripts/templates/summary.ejs'],

        tagName: 'table',

        id: '',

        className: '',

        events: {
            'click tbody': 'clicked'
        },

        initialize: function () {
            this.listenTo(this.collection, 'reset', this.render);
            return this;
        },

        render: function () {
            this.$el.html(this.template());
            this.collection.each(this.renderRun, this);
            return this;
        },

        renderRun: function (run) {
            var row = new Running.Views.SummaryRow({ model: run });
            row.render();
            row.$el.attr('data-id', run.id);
            this.$('tbody').append(row.$el);
        },

        clicked: function (ev) {
            var $target = $(ev.target)
            var id = $target.attr('data-id') ||
                     $target.parents('[data-id]').attr('data-id');
            this.trigger('select', id);
        }

    });

})();
