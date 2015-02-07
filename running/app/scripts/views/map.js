/*global Running, Backbone, JST*/

Running.Views = Running.Views || {};

(function () {
    'use strict';

    Running.Views.Map = Backbone.View.extend({

        id: "map",

        initialize: function () {
            this.listenTo(this.model, 'change:gps', this.render);
            return this;
        },

        render: function() {
            if (document.getElementById(this.id)) {
                this.drawMap();
            } else {
                _.defer(_(function(){ this.drawMap(); }).bind(this));
            }
            return this;
        },

        drawMap: function() {
            if (this.model.get("gps") && this.model.get("gps").waypoints) {
                if (this.map) {
                    this.map.remove();
                }
                var points = _(this.model.get("gps").waypoints).map(function(pt) {
                    return [pt.latitude, pt.longitude];
                });
                var path = new L.Polyline(points, {color: '#1788cc'});
                this.map = L.map(this.id).fitBounds(path.getBounds())
                    .addLayer(path);
                var tiles = L.tileLayer(
                    'http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/'+
                    'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
                    {
                        attribution: 'Tiles &copy; Esri &mdash; '+
                                     'Esri, DeLorme, NAVTEQ',
                        maxZoom: 16
                    }
                );
                this.map.addLayer(tiles);
            }
        }

    });

})();
