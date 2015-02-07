/*global Running, Backbone, JST*/

Running.Views = Running.Views || {};

(function () {
    'use strict';

    Running.Views.Charts = Backbone.View.extend({

        template: JST['app/scripts/templates/charts.ejs'],

        defaults: {
            width: 600,
            height: 120
        },

        className: "charts-wrapper",

        initialize: function() {
            _(this.options).defaults(this.defaults);
        },

        render: function() {

            this.$el.html(this.template());

            /*
             * Nike+ returns at least four types of charts
             * as metrics: distance, heart rate, speed, and
             * GPS signal strength. We really only care about the
             * first two. Speed isn't present in all activities,
             * but distance is. Because we want to graph pace,
             * we can only count on distance to derive it. And
             * as long as we're getting pace from the distance
             * graph, the speed metrics are redundant. GPS
             * signal strength doesn't seem useful enough to
             * bother.
             *
             * If GPS waypoint data is available, we can also
             * graph elevation, but that data is in a separate
             * attribute of the model (not the metrics attribute).
             */
            var metrics;
            if (metrics = this.model.get("metrics")) {

                /*
                 * First let's get the distance. It *should* always
                 * be there as long as any graphs are there. Convert
                 * to miles while we're extracting the data.
                 */

                var dist = _(metrics).find(function(metric) {
                    return metric.metricType.toUpperCase() === "DISTANCE";
                });
                dist = dist && _(dist.values).map(function(value) {
                    return parseFloat(value) * 0.621371;
                });

                /*
                 * Creata a time array as well. We're assuming that
                 * (a) all metric arrays are the same length, and
                 * (b) the intervalMetric value is accurate.
                 */
                var interval = parseInt(metrics[0].intervalMetric, 10);
                var time = _.range(0, interval*metrics[0].values.length, interval);

                /*
                 * Now that we've got the time values, calculate what
                 * we'd use for tick marks on the x-axis. We have to
                 * calculate these manually to ensure precise alignment
                 * and reasonable values. We want to round to some
                 * integer multiple of 5-minute values, and we want
                 * to have no more than about eight marks.
                 */
                var maxTime = Math.max.apply(null, time);
                var tickCount = Math.floor(maxTime/300);
                var tickScale = Math.ceil(tickCount/8)*5;
                var timeTicks = _.range(tickScale*60, Math.floor(maxTime/tickScale)*tickScale, tickScale*60);
                timeTicks = _(timeTicks).map(function(t) {
                    if (t < 3600) { return [t, t/60 + ":00"];}
                    return [t, Math.floor(t/3600) + ":" + _((t%3600)/60).pad(2, "0") + ":00"];
                });

                /*
                 * With time and distance, we can calculate pace.
                 */
                var pace = dist && _(dist).map(function(pt, idx) {
                    if ((idx === 0) || (dist[idx] === dist[idx-1])) { return null; }
                    return interval / (60* (dist[idx] - dist[idx-1]));
                });
                /*
                 * Clean up any outliers.
                 */
                pace = pace && _(pace).map(function(pt) {
                   if ((pt > 4) && (pt < 20)) { return pt;}
                   return null;
                });

                /*
                 * Heart rate may be available, but it's not guaranteed.
                 * It's also subject to dropouts where there is no value
                 * recorded. We'll filter those out of our data.
                 */
                var heartrate = _(metrics).find(function(metric) {
                    return metric.metricType.toUpperCase() === "HEARTRATE";
                });
                heartrate = heartrate && _(heartrate.values).map(function(value, idx) {
                    return parseInt(value,10) || null;
                });

                /*
                 * Elevation will be available only if there is GPS data. If
                 * it's there, let's grab it and convert meters to feet while
                 * we're at it.
                 */
                var gps = this.model.get("gps");
                var elevation = gps && gps.waypoints &&
                                _(gps.waypoints)
                                    .chain()
                                    .pluck("elevation")
                                    .map(function(pt) {
                                        return 3.28084*parseFloat(pt);
                                    })
                                    .value();

                /*
                 * At least right now, there's a bit of a bug in Nike's
                 * response for GPS data. It claims that the measurements
                 * are on the same time scale as the other metrics (every
                 * 10 seconds), but, in fact, the GPS measurements are
                 * reported on different intervals. To work around this bug, we
                 * ignore the reported interval, and calculate one ourselves.
                 * Also, we want to normalize the elevation graph to the
                 * same time scale as all the others. Doing that will give
                 * us the additional benefit of averaging the GPS elevation
                 * data; averaging is useful here because GPS elevation
                 * measurements aren't generally very accurate.
                 */

                var gps_ratio = elevation && (elevation.length / time.length);
                elevation = elevation && _(time).map(function(pt, idx){
                    /*
                     * Create an array that specifies the elevation points
                     * we're going to average for this value.
                     */
                    var range = _.range(
                        Math.round(Math.max(gps_ratio*idx-gps_ratio/2, 0)),
                        Math.round(Math.min(gps_ratio*idx+gps_ratio/2, elevation.length))
                    );
                    /*
                     * Return the average of the selected points.
                     */
                    return _(range).reduce(function(avg,idx,cnt){
                        return ((avg*cnt + elevation[idx]) / (cnt+1));
                    }, 0);
                });

                /*
                 * Although you might expect that we'd go ahead
                 * and create the charts as part of the render()
                 * method, that won't work so well. Charting
                 * libraries based on HTML5 <canvas> really only
                 * work if the containing <div> for the <canvas>
                 * is actually present in the DOM. They need that
                 * because they rely on the browser to calculate
                 * sizes for them, and they're not robust enough
                 * to handle elements outside of the DOM (even
                 * if those elements have explicit properties).
                 * To cope with this, all we're going to do in
                 * the render() function is prepare the charts
                 * for graphing. Then we'll use a handy utility
                 * from Underscore.js to defer actually drawing
                 * the graphs until the Javascript call stack
                 * has been exhausted. We're counting on the
                 * application to add this.el to the DOM before
                 * it completes, at which point our deferred
                 * function will swing into action. If that's
                 * not the case, it's always possible to call
                 * drawGraphs() directly since it's a public
                 * method.
                 */

                this.plots = [];
                var plot;

                /*
                 * The charting functionality itself is pretty much a
                 * copy of the implementation described in chapter 2.
                 * We'll only include a few highlights here in these
                 * comments, but the earlier version provides extensive
                 * details.
                 */

                /*
                 * Define generic options we'll use for all plots.
                 */
                var options = {
                    legend: {show: false},
                    series: {lines: {fill: false, lineWidth: 2}, shadowSize: 1},
                    xaxis:  {show: true, min: 0, max: Math.max.apply(null, time), ticks: timeTicks, labelHeight: 0, autoscaleMargin: 0, tickFormatter: function() {return "";}},
                    yaxis:  {show: false},
                    grid:   {show: true, borderWidth: 0, borderColor: null, margin: 0, labelMargin: 0, axisMargin: 0, minBorderMargin: 0, hoverable: true, autoHighlight: false},
                };
                var clean, min, max, mean, div;

                /* --------------------
                 * Pace chart
                 * --------------------*/

                if (pace) {
                    plot = {};
                    plot.placeholder = $("<figure>");
                    this.$el.find(".charts-graphs").append(plot.placeholder);
                    plot.data = _.zip(time, pace);
                    plot.options = _({}).extend(options,{
                        yaxis:  {show: false, min: 0, max: 1.2*Math.max.apply(null, pace)},
                        series: {lines: {fill: true, fillColor: "#9fceea", lineWidth: 1}, shadowSize: 0},
                        colors: ["#1788cc"],
                    });
                    plot.format = function(val) {
                        if (!_(val).isFinite()) { return ""; }
                        return Math.floor(val)  + ":" + _(Math.round((val  % Math.floor(val))*60)).pad(2, "0");
                    };
                    this.plots.push(plot);
                    clean = _(pace).chain()
                        .filter(function(pt) {return _(pt).isFinite();})
                        .reject(function(pt) {return pt === 0;})
                        .value();
                    min = Math.min.apply(null, clean);
                    max = Math.max.apply(null, clean);
                    mean = _(clean).reduce(function(sum, pt) {return sum+pt;}, 0)/clean.length;
                    div = $("<div>")
                        .append($("<p>").html("<strong>Pace</strong>"))
                        .append($("<p>").text("Slowest: " + plot.format(max)  + " per Mile"))
                        .append($("<p>").text("Average: " + plot.format(mean) + " per Mile"))
                        .append($("<p>").text("Fastest: " + plot.format(min)  + " per Mile"));
                    this.$el.find(".charts-legend").append(div);
                }

                /* --------------------
                 * Heart Rate chart
                 * --------------------*/

                if (heartrate) {
                    plot = {};
                    plot.placeholder = $("<figure>");
                    this.$el.find(".charts-graphs").append(plot.placeholder);
                    plot.data = _.zip(time, heartrate);
                    plot.options = _({}).extend(options,{
                        yaxis:  {show: false, min: 0, max: 1.2*Math.max.apply(null, heartrate)},
                        series: {lines: {fill: true, fillColor: "#eaaa9f", lineWidth: 1}, shadowSize: 0},
                        colors: ["#cc3217"],
                    });
                    plot.format = function(val) {
                        if (!_(val).isFinite() || (val === 0)) { return ""; }
                        return Math.round(val);
                    };
                    this.plots.push(plot);
                    clean = _(heartrate).chain()
                        .filter(function(pt) {return _(pt).isFinite();})
                        .reject(function(pt) {return pt === 0;})
                        .value();
                    min = Math.min.apply(null, clean);
                    max = Math.max.apply(null, clean);
                    mean = _(clean).reduce(function(sum, pt) {return sum+pt;}, 0)/clean.length;
                    div = $("<div>")
                        .append($("<p>").html("<strong>Heart Rate</strong>"))
                        .append($("<p>").text("Minimum: " + plot.format(min)  + " bpm"))
                        .append($("<p>").text("Average: " + plot.format(mean) + " bpm"))
                        .append($("<p>").text("Maximum: " + plot.format(max)  + " bpm"));
                    this.$el.find(".charts-legend").append(div);
                }

                /* --------------------
                 * Elevation chart
                 * --------------------*/

                if (elevation) {
                    plot = {};
                    plot.placeholder = $("<figure>");
                    this.$el.find(".charts-graphs").append(plot.placeholder);
                    plot.data = _.zip(time, elevation);
                    var min = Math.min.apply(null,elevation);
                    var max = Math.max.apply(null,elevation);
                    var range = max - min;
                    min -= 0.2*range;
                    max += 0.2*range;
                    plot.options = _({}).extend(options,{
                        yaxis:  {show: false, min: min, max: max},
                        series: {lines: {fill: true, fillColor: "#ead19f", lineWidth: 1}, shadowSize: 0},
                        colors: ["#cc9117"],
                    });
                    plot.format = function(val) {
                        if (!_(val).isFinite()) { return ""; }
                        return Math.round(val);
                    };
                    this.plots.push(plot);
                    min = Math.min.apply(null, elevation);
                    max = Math.max.apply(null, elevation);
                    mean = _(elevation).reduce(function(sum, pt) {return sum+pt;}, 0)/elevation.length;
                    div = $("<div>")
                        .append($("<p>").html("<strong>Elevation</strong>"))
                        .append($("<p>").text("Minimum: " + plot.format(min)  + " ft"))
                        .append($("<p>").text("Average: " + plot.format(mean) + " ft"))
                        .append($("<p>").text("Maximum: " + plot.format(max)  + " ft"));
                    this.$el.find(".charts-legend").append(div);
                }

                /* ---------------------------------------------
                 * Dummy chart at the bottom for the tick marks
                 * ---------------------------------------------*/

                plot = {};
                plot.placeholder = $("<div>").addClass("x-axis");
                this.$el.find(".charts-graphs").append(plot.placeholder);
                plot.data = _(time).map(function(t) { return [t, null];});
                plot.options = _({}).extend(options,{
                    xaxis:  {
                        show: true,
                        min: 0,
                        max: Math.max.apply(null, time),
                        ticks: timeTicks,
                        labelHeight: 12,
                        autoscaleMargin: 0,
                    },
                    yaxis:  {show: false, min: 100, max: 200},
                    grid:   {show: true, borderWidth: 0, margin: 0, labelMargin: 0, axisMargin: 0, minBorderMargin: 0},
                });
                plot.format = function(val) {return ""; };
                this.plots.push(plot);
            }

            /*
             * Here's the part where we set up the deferred call
             * that will actually draw the charts.
             */
            _.defer(_(function(){ this.drawGraphs(); }).bind(this));
            return this;
        },
        drawGraphs: function() {
            /*
             * Iterate through all the plots we created and draw them.
             */
            _(this.plots).each(function(plot) {
                /* call the flot library to draw the graph */
                plot.plot = $.plot(plot.placeholder, [plot.data], plot.options);
                /* also create a moving legend to show a value */
                plot.value = $("<div>").css({
                    'position':  "absolute",
                    'top':       plot.placeholder.position().top + "px",
                    'display':   "none",
                    'z-index':   1,
                    'font-size': "11px",
                    'color':     "black"
                });
                this.$el.append(plot.value);
            }, this);

            /*
             * Now prepare to handle hover events on the charts.
             */
            var self = this;
            this.$el.find(".charts-graphs").on("plothover", function(ev, pos) {
                /* figure out where to position the sliding marker */
                var xvalue = Math.round(pos.x/10);
                var left = _(self.plots).last().plot.pointOffset(pos).left;
                var height = self.$el.find(".charts-graphs").height() - 15;
                /* position the marker and turn it on */
                self.$el.find(".charts-marker").css({
                    'top':    0,
                    'left':   left,
                    'width':  "1px",
                    'height': height
                }).show();
                /* go through each chart and show it's value at the cursor */
                _(self.plots).each(function(plot){
                    if ((xvalue >= 0) && (xvalue < plot.data.length)) {
                        $(plot.value).text(plot.format(plot.data[xvalue][1])).css("left", (left+4)+"px").show();
                    }
                });
            /* turn off the marker and values when the mouse leaves */
            }).on("mouseout", function(ev) {
                if (ev.relatedTarget.className !== "charts-marker") {
                    self.$el.find(".charts-marker").hide();
                    _(self.plots).each(function(plot) { plot.value.hide(); });
                }
            });
            /* also turn off things if the mouse leaves from the marker itself */
            self.$el.find(".charts-marker").on("mouseout", function(ev) {
                self.$el.find(".charts-marker").hide();
                _(self.plots).each(function(plot) { plot.value.hide(); });
            });
        }

    });

})();
