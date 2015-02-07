/*global Running, Backbone, JST*/

Running.Views = Running.Views || {};

(function () {
    'use strict';

    Running.Views.SummaryRow = Backbone.View.extend({

        template: JST['app/scripts/templates/summaryRow.ejs'],

        tagName: 'tr',

        id: '',

        className: '',

        events: {},

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
            return this;
        },

        render: function () {
            var run = {};
            run.date = moment(this.model.get("startTime")).calendar();
            run.duration = this.model.get("metricSummary").duration.split(".")[0];
            run.distance = Math.round(62. *
                this.model.get("metricSummary").distance)/100 +
                " Miles";
            run.calories = this.model.get("metricSummary").calories;
            var secs = _(run.duration.split(":")).reduce(function(sum, num) {
                return sum*60+parseInt(num,10); }, 0);
            var pace = moment.duration(1000*secs/parseFloat(run.distance));
            run.pace = pace.minutes() + ":" + _(pace.seconds()).pad(2, "0");
            this.$el.html(this.template(run));
            return this;
        }

    });

})();
