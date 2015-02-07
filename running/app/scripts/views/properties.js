/*global Running, Backbone, JST*/

Running.Views = Running.Views || {};

(function () {
    'use strict';

    Running.Views.Properties = Backbone.View.extend({

        template: JST['app/scripts/templates/properties.ejs'],

        tagName: 'dl',

        id: '',

        className: '',

        events: {},

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },

        obj2Html: function(obj) {
            return (
                _(obj).reduce(function(html, value, key) {
                    if (key === "tags") {
                        return html + _(value).reduce(function(html, tag) {
                            if (tag.tagValue) {
                                 var obj = {};
                                obj[tag.tagType] = _.chain(tag.tagValue).humanize().titleize().value();
                                html += this.obj2Html(obj);
                            }
                            return html;
                        }, "", this);
                    }
                    key = _.chain(key).humanize().titleize().value();
                    if (_(value).isArray()) {
                        value = "[" + value.length + " items]";
                    }
                    if (_(value).isObject()) {
                        html += this.obj2Html(value);
                    } else {
                        value = _(value.toString().toLowerCase()).titleize();
                        value = value.replace(/ipod/gi,"iPod");
                        value = value.replace(/iphone/gi, "iPhone");
                        value = value.replace(/gps/gi, "GPS");
                        value = value.replace(/gmt/gi, "GMT");
                        html += this.template({ key: key, value: value });
                    }
                    return html;
                }, "", this)
            );
        },

        render: function () {
            this.$el.html(this.obj2Html(this.model.attributes));
            return this;
        }

    });

})();
